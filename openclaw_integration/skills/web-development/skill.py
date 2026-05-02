#!/usr/bin/env python3
"""
OpenClaw Web Development Skill
Automates building, deploying and fixing web applications
"""

import json
import subprocess
import sys
from pathlib import Path

import requests

class WebDevSkill:
    """Web development automation skill for OpenClaw."""

    def __init__(self):
        self.name = "web-development"
        self.version = "1.0.0"
        self.config = self._load_config()

    def _load_config(self):
        config_path = Path.home() / ".openclaw" / "config" / "webdev.json"
        if config_path.exists():
            return json.loads(config_path.read_text())
        return {
            "frameworks": ["nextjs", "react", "astro", "svelte"],
            "deployment_targets": ["cloudflare_pages", "vercel", "netlify"],
            "ai_assistants": {
                "ollama": {"enabled": True, "model": "deepseek-r1:1.5b"},
                "claude": {"enabled": True}
            }
        }

    def build_site(self, project_path, framework="nextjs"):
        """Build web application"""
        cmd = {
            "nextjs": ["npm", "run", "build"],
            "react": ["npm", "run", "build"],
            "astro": ["npm", "run", "build"]
        }.get(framework, ["npm", "run", "build"])

        proc_result = subprocess.run(cmd, cwd=project_path, capture_output=True, text=True, check=False)
        return {"success": proc_result.returncode == 0, "output": proc_result.stdout, "errors": proc_result.stderr}

    def fix_deployment(self, project_path, platform="cloudflare_pages"):
        """Auto-fix common deployment issues"""
        fixes = []

        # Check and fix _headers for Cloudflare
        if platform == "cloudflare_pages":
            headers_file = Path(project_path) / "_headers"
            if headers_file.exists():
                content = headers_file.read_text()
                # Fix common typos
                if "Referrer-Options" in content:
                    content = content.replace("Referrer-Options", "Referrer-Policy")
                    headers_file.write_text(content)
                    fixes.append("Fixed Referrer-Options typo")

        return {"fixed": len(fixes) > 0, "fixes": fixes}

    def deploy(self, project_path, platform="cloudflare_pages"):
        """Deploy to specified platform"""
        if platform == "cloudflare_pages":
            # Trigger GitHub Actions deploy
            proc_result = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=project_path,
                capture_output=True,
                text=True,
                check=False
            )
            return {"success": proc_result.returncode == 0, "platform": platform}

        return {"success": False, "error": f"Platform {platform} not supported"}

    def health_check(self, check_url):
        """Check if site is online and healthy"""
        try:
            response = requests.get(check_url, timeout=10)
            return {
                "online": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds()
            }
        except requests.exceptions.RequestException as err:
            return {"online": False, "error": str(err)}

if __name__ == "__main__":
    skill = WebDevSkill()

    if len(sys.argv) < 2:
        print("Usage: python skill.py [command] [args...]")
        print("Commands: build, fix, deploy, health")
        sys.exit(1)

    command = sys.argv[1]

    if command == "build":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = skill.build_site(path)
        print(json.dumps(result, indent=2))

    elif command == "fix":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = skill.fix_deployment(path)
        print(json.dumps(result, indent=2))

    elif command == "deploy":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = skill.deploy(path)
        print(json.dumps(result, indent=2))

    elif command == "health":
        check_url = sys.argv[2] if len(sys.argv) > 2 else "https://bodulica.shop"
        result = skill.health_check(check_url)
        print(json.dumps(result, indent=2))
