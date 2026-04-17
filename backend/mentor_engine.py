"""
═══════════════════════════════════════════════════════════════════════════════
CRYPTORADAR MENTOR ENGINE
═══════════════════════════════════════════════════════════════════════════════

AI-powered trading educator that interprets live market data and explains it
to beginner traders. Uses Claude Sonnet 4.5 for natural, educational responses.

Features:
- Event-driven analysis (on regime change, V3 signal)
- On-demand analysis (user request)
- Freemium model: PUBLIC sees Context + Tip, ADMIN sees full analysis

Author: CryptoRadar Team
Version: 1.0.0
"""

import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# MENTOR SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════════

MENTOR_SYSTEM_PROMPT = """You are the "CryptoRadar Mentor," a Senior Market Analyst and Trading Educator.

**Objective**: Interpret the live market data from the CryptoRadar V3 Engine and explain it to a beginner trader. Your goal is not just to provide information, but to teach the user "why" the market is behaving this way.

**Guidelines for Analysis**:

1. **Regime & Energy**: 
   - COMPRESSION = a coiled spring ready to release
   - TREND = directional momentum, follow it
   - RANGE = price bouncing between levels, wait for breakout
   - EXPANSION = explosive move in progress
   - If Energy > 75%, emphasize that a volatile move is imminent

2. **The Conflict Principle**: 
   - If Market Bias is Bullish but Liquidity Direction is Down, explain this as a "Liquidity Hunt" or "Stop Run" before the actual move
   - This is when smart money grabs liquidity before moving price in their intended direction

3. **Open Interest (OI)**: 
   - Rising OI = "new money entering the room," confirming strength
   - Falling OI = positions closing, trend may be exhausting

4. **Funding Rate**: 
   - High positive = too many longs, squeeze risk for longs
   - High negative = too many shorts, squeeze risk for shorts
   - Near zero = balanced market

5. **Liquidity Zones**:
   - Price tends to move toward areas of high liquidity
   - "Magnet effect" - explain how stop losses create liquidity pools

**Output Format** (ALWAYS respond in Italian):

🧭 **Contesto**
[1 sentence summary of current market state]

🧠 **La Logica**
[Connect 2-3 key metrics to explain the probable next move. Be specific with numbers.]

🎓 **Lezione di Trading**
[Explain ONE technical concept present in the current data. Examples:
- "Cos'è la Compressione di Mercato?"
- "Perché il prezzo cerca la Liquidità?"
- "Come interpretare l'Open Interest"]

🎯 **Consiglio del Mentor**
[What the user should watch for in the next few hours. Be actionable but not financial advice.]

**Tone**: Professional, encouraging, educational. Focus on market mechanics and statistical probability, not financial advice. Use simple Italian that a beginner can understand."""


# ═══════════════════════════════════════════════════════════════════════════════
# MENTOR ENGINE CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class MentorEngine:
    """
    AI-powered trading mentor that generates educational market analysis.
    """
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        self.last_analysis: Optional[Dict[str, Any]] = None
        self.last_analysis_time: Optional[datetime] = None
        self.cache_duration_seconds = 300  # 5 minutes cache
        
        if not self.api_key:
            logger.warning("[MENTOR] EMERGENT_LLM_KEY not configured")
    
    def _create_chat(self, session_id: str) -> LlmChat:
        """Create a new LlmChat instance with Claude Sonnet 4.5"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=MENTOR_SYSTEM_PROMPT
        )
        # Use Claude Sonnet 4.5 as per co-founder decision
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        return chat
    
    def _format_market_data(self, market_data: Dict[str, Any]) -> str:
        """Format market data into a clear prompt for the AI"""
        
        # Extract values with defaults
        regime = market_data.get("market_regime", "UNKNOWN")
        regime_confidence = market_data.get("regime_confidence", 0)
        bias = market_data.get("market_bias", "NEUTRAL")
        bias_percentage = market_data.get("bias_percentage", 50)
        energy = market_data.get("energy_score", 50)
        energy_level = market_data.get("energy_level", "MEDIUM")
        
        # Liquidity data
        liquidity_direction = market_data.get("liquidity_direction", "BALANCED")
        magnet_score = market_data.get("magnet_score", 50)
        magnet_price = market_data.get("magnet_price", 0)
        magnet_distance = market_data.get("magnet_distance_percent", 0)
        
        # OI and Funding
        oi_change = market_data.get("oi_change_percent", 0)
        oi_trend = market_data.get("oi_trend", "STABLE")
        funding_rate = market_data.get("funding_rate", 0)
        funding_status = market_data.get("funding_status", "NEUTRAL")
        
        # Price
        btc_price = market_data.get("btc_price", 0)
        
        # V3 Signal info (if present)
        v3_signal = market_data.get("v3_signal")
        v3_direction = market_data.get("v3_direction")
        v3_phase = market_data.get("v3_phase")
        
        # Build the prompt
        prompt = f"""Analizza questi dati di mercato BTC live:

📊 DATI CORRENTI:
- Prezzo BTC: ${btc_price:,.0f}
- Regime: {regime} ({regime_confidence}% confidence)
- Bias: {bias} ({bias_percentage}%)
- Energia: {energy}/100 ({energy_level})

💧 LIQUIDITÀ:
- Direzione Magnete: {liquidity_direction}
- Forza Attrazione: {magnet_score}/100
- Target Magnete: ${magnet_price:,.0f} ({magnet_distance:+.2f}% dal prezzo)

📈 DERIVATI:
- Variazione OI: {oi_change:+.2f}% ({oi_trend})
- Funding Rate: {funding_rate:.4f}% ({funding_status})"""

        if v3_signal:
            prompt += f"""

🎯 SEGNALE V3 ATTIVO:
- Direzione: {v3_direction}
- Fase: {v3_phase}
- Segnale: {v3_signal}"""
        
        prompt += "\n\nGenera l'analisi educativa seguendo il formato richiesto."
        
        return prompt
    
    async def generate_analysis(
        self, 
        market_data: Dict[str, Any],
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Generate educational market analysis using Claude.
        
        Args:
            market_data: Current market state from V3 engine
            force_refresh: Bypass cache and generate new analysis
            
        Returns:
            Dict with analysis sections and metadata
        """
        
        if not self.api_key:
            return {
                "success": False,
                "error": "EMERGENT_LLM_KEY not configured",
                "analysis": None
            }
        
        # Check cache (unless force refresh)
        if not force_refresh and self.last_analysis:
            cache_age = (datetime.now(timezone.utc) - self.last_analysis_time).total_seconds()
            if cache_age < self.cache_duration_seconds:
                logger.info(f"[MENTOR] Returning cached analysis (age: {cache_age:.0f}s)")
                return {
                    "success": True,
                    "cached": True,
                    "cache_age_seconds": int(cache_age),
                    **self.last_analysis
                }
        
        try:
            # Create chat instance
            session_id = f"mentor_{uuid.uuid4().hex[:8]}"
            chat = self._create_chat(session_id)
            
            # Format market data into prompt
            prompt = self._format_market_data(market_data)
            
            # Send message and get response
            logger.info("[MENTOR] Generating analysis with Claude Sonnet 4.5...")
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse the response into sections
            analysis = self._parse_analysis(response)
            
            # Cache the result
            self.last_analysis = analysis
            self.last_analysis_time = datetime.now(timezone.utc)
            
            logger.info("[MENTOR] Analysis generated successfully")
            
            return {
                "success": True,
                "cached": False,
                **analysis
            }
            
        except Exception as e:
            logger.error(f"[MENTOR] Error generating analysis: {e}")
            return {
                "success": False,
                "error": str(e),
                "analysis": None
            }
    
    def _parse_analysis(self, raw_response: str) -> Dict[str, Any]:
        """
        Parse the AI response into structured sections.
        
        Returns:
            Dict with context, logic, lesson, tip (for access control)
        """
        
        sections = {
            "full_analysis": raw_response,
            "context": "",      # PUBLIC
            "logic": "",        # ADMIN/PREMIUM
            "lesson": "",       # ADMIN/PREMIUM
            "tip": "",          # PUBLIC
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Try to extract sections
        lines = raw_response.split("\n")
        current_section = None
        current_content = []
        
        section_markers = {
            "🧭": "context",
            "contesto": "context",
            "🧠": "logic",
            "logica": "logic",
            "🎓": "lesson",
            "lezione": "lesson",
            "🎯": "tip",
            "consiglio": "tip"
        }
        
        for line in lines:
            line_lower = line.lower()
            
            # Check if this line starts a new section
            new_section = None
            for marker, section_name in section_markers.items():
                if marker in line_lower:
                    new_section = section_name
                    break
            
            if new_section:
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                
                # Start new section
                current_section = new_section
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = "\n".join(current_content).strip()
        
        # Clean up sections
        for key in ["context", "logic", "lesson", "tip"]:
            if sections[key]:
                # Remove markdown bold markers for cleaner display
                sections[key] = sections[key].replace("**", "").strip()
        
        return sections
    
    def get_public_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return only the public-visible parts of the analysis.
        PUBLIC users see: Context + Tip
        """
        if not analysis.get("success"):
            return analysis
        
        return {
            "success": True,
            "access_level": "public",
            "context": analysis.get("context", ""),
            "tip": analysis.get("tip", ""),
            "timestamp": analysis.get("timestamp"),
            "cached": analysis.get("cached", False)
        }
    
    def get_full_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return the complete analysis for ADMIN/PREMIUM users.
        ADMIN users see: Context + Logic + Lesson + Tip
        """
        if not analysis.get("success"):
            return analysis
        
        return {
            "success": True,
            "access_level": "admin",
            "context": analysis.get("context", ""),
            "logic": analysis.get("logic", ""),
            "lesson": analysis.get("lesson", ""),
            "tip": analysis.get("tip", ""),
            "full_analysis": analysis.get("full_analysis", ""),
            "timestamp": analysis.get("timestamp"),
            "cached": analysis.get("cached", False)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

mentor_engine = MentorEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

async def get_mentor_analysis(
    market_data: Dict[str, Any],
    is_admin: bool = False,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Main entry point for getting mentor analysis.
    
    Args:
        market_data: Current market state
        is_admin: Whether user has admin access
        force_refresh: Bypass cache
        
    Returns:
        Analysis dict (filtered based on access level)
    """
    
    # Generate analysis
    analysis = await mentor_engine.generate_analysis(market_data, force_refresh)
    
    # Return based on access level
    if is_admin:
        return mentor_engine.get_full_analysis(analysis)
    else:
        return mentor_engine.get_public_analysis(analysis)
