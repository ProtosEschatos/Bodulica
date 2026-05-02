#!/usr/bin/env python3
"""
🔧 Claude AI Code Assistant Skill for OpenClaw
Uses Claude for code review, bug fixing, and system optimization
"""

import os
import json
import requests
import subprocess
import ast
import re
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

class ClaudeCodeAssistant:
    def __init__(self):
        self.api_key = os.getenv('CLAUDE_API_KEY')
        self.base_url = "https://api.anthropic.com/v1"
        self.model = "claude-3-5-sonnet-20241022"
        self.project_root = "/home/sovereign/CascadeProjects/Celestial-Oracle"
        
        # Internet providers
        self.perplexity_key = os.getenv('PERPLEXITY_API_KEY')
        self.perplexity_url = "https://api.perplexity.ai/chat/completions"
        
        # DeepSeek providers
        self.deepseek_online_key = os.getenv('DEEPSEEK_API_KEY') or "free"
        self.deepseek_online_url = "https://api.deepseek.com/chat/completions"
        self.deepseek_local_url = "http://localhost:11434/api/generate"
        
    def call_claude(self, prompt: str, max_tokens: int = 1000) -> str:
        """Call Claude API with prompt"""
        headers = {
            "x-api-key": self.api_key,
            "content-type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/messages", 
                                   headers=headers, json=data, timeout=60)
            response.raise_for_status()
            result = response.json()
            return result["content"][0]["text"]
        except Exception as e:
            return f"Error calling Claude: {str(e)}"
    
    def review_code_file(self, file_path: str) -> Dict:
        """Review a specific code file for issues and improvements"""
        try:
            full_path = Path(self.project_root) / file_path
            if not full_path.exists():
                return {"success": False, "error": f"File not found: {file_path}"}
            
            with open(full_path, 'r', encoding='utf-8') as f:
                code_content = f.read()
            
            prompt = f"""
Review this code file for:
1. Bugs and potential issues
2. Security vulnerabilities
3. Performance optimizations
4. Code quality improvements
5. Best practices violations

File: {file_path}
Language: {file_path.split('.')[-1] if '.' in file_path else 'unknown'}

Code:
```
{code_content}
```

Provide specific, actionable feedback with code examples where needed.
Focus on critical issues first, then optimizations.
"""
            
            review = self.call_claude(prompt, 1500)
            
            return {
                "success": True,
                "file_path": file_path,
                "review": review,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def analyze_system_logs(self, log_file: str = "/tmp/api.log") -> Dict:
        """Analyze system logs for issues and patterns"""
        try:
            if not os.path.exists(log_file):
                return {"success": False, "error": f"Log file not found: {log_file}"}
            
            with open(log_file, 'r') as f:
                logs = f.read()[-5000:]  # Last 5000 chars
            
            prompt = f"""
Analyze these system logs for:
1. Error patterns and root causes
2. Performance issues
3. Security concerns
4. Resource usage problems
5. Recommendations for fixes

Logs:
```
{logs}
```

Provide structured analysis with specific recommendations.
"""
            
            analysis = self.call_claude(prompt, 1000)
            
            return {
                "success": True,
                "log_file": log_file,
                "analysis": analysis,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def optimize_database_queries(self) -> Dict:
        """Analyze and suggest database query optimizations"""
        try:
            # Get slow queries from database (if available)
            slow_queries = self._get_slow_queries()
            
            prompt = f"""
Analyze these database queries and suggest optimizations:
{slow_queries}

Focus on:
1. Index improvements
2. Query restructuring
3. Caching opportunities
4. Performance gains

Provide specific SQL optimization suggestions.
"""
            
            optimizations = self.call_claude(prompt, 1200)
            
            return {
                "success": True,
                "optimizations": optimizations,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def improve_openclaw_functionality(self) -> Dict:
        """Analyze OpenClaw and suggest improvements"""
        try:
            # Read OpenClaw configuration and scripts
            config_path = Path(self.project_root) / "openclaw_integration/config/openclaw.json"
            script_path = Path(self.project_root) / "openclaw_integration/openclaw-agent.sh"
            
            config_content = ""
            script_content = ""
            
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config_content = f.read()
            
            if script_path.exists():
                with open(script_path, 'r') as f:
                    script_content = f.read()
            
            prompt = f"""
Analyze this OpenClaw configuration and script for improvements:

CONFIG:
{config_content}

SCRIPT:
{script_content}

Suggest improvements for:
1. Error handling and resilience
2. Performance and efficiency
3. Monitoring and alerting
4. Security hardening
5. Automation capabilities
6. Code maintainability

Provide specific code improvements and new features.
"""
            
            improvements = self.call_claude(prompt, 1500)
            
            return {
                "success": True,
                "improvements": improvements,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _get_slow_queries(self) -> str:
        """Get slow queries from database (placeholder)"""
        # This would integrate with your database monitoring
        return "No slow query data available - integrate with database monitoring"
    
    def fix_critical_bugs(self, bug_report: str) -> Dict:
        """Generate fixes for reported bugs"""
        prompt = f"""
Analyze this bug report and provide specific code fixes:

Bug Report:
{bug_report}

Provide:
1. Root cause analysis
2. Specific code fixes
3. Testing recommendations
4. Prevention strategies

Focus on minimal, safe fixes that address the core issue.
"""
        
        fixes = self.call_claude(prompt, 1200)
        
        return {
            "success": True,
            "bug_report": bug_report,
            "fixes": fixes,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Test the code assistant
    claude = ClaudeCodeAssistant()
    
    # Test code review
    result = claude.review_code_file("backend/api_server.py")
    print("Code Review Test:", json.dumps(result, indent=2))
