#!/usr/bin/env python3
"""
OpenClaw Web Development Skill v2
Integrated with Stripe, Supabase, Cloudflare, and AI models
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

import requests


class WebDevSkill:
    """Web development automation skill with full tool integration."""

    def __init__(self):
        self.name = "web-development"
        self.version = "2.0.0"
        self.config = self._load_config()
        self.tools = self._load_tools()

    def _load_config(self) -> dict:
        config_path = Path.home() / ".openclaw" / "config" / "openclaw.json"
        if config_path.exists():
            return json.loads(config_path.read_text())
        return {}

    def _load_tools(self) -> dict:
        tools_path = Path(__file__).parent.parent / "config" / "tools.json"
        if tools_path.exists():
            return json.loads(tools_path.read_text())
        return {}

    # === AI Integration ===
    def generate_code(self, prompt: str, model: str = "qwen3:8b") -> dict:
        """Generate code using Ollama (Qwen3, Qwen2.5, or DeepSeek)."""
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120
            )
            data = response.json()
            return {
                "success": True,
                "code": data.get("response", ""),
                "model": model
            }
        except requests.exceptions.RequestException as err:
            return {"success": False, "error": str(err), "model": model}

    # === Stripe Integration ===
    def stripe_setup(self) -> dict:
        """Check and setup Stripe CLI."""
        try:
            result = subprocess.run(
                ["stripe", "--version"],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0:
                return {
                    "installed": True,
                    "version": result.stdout.strip(),
                    "login_status": self._check_stripe_login()
                }
            return {"installed": False, "message": "Stripe CLI not found"}
        except FileNotFoundError:
            return {"installed": False, "message": "Stripe CLI not installed"}

    def _check_stripe_login(self) -> bool:
        """Check if user is logged into Stripe."""
        try:
            result = subprocess.run(
                ["stripe", "config", "--list"],
                capture_output=True,
                text=True,
                check=False
            )
            return "account_id" in result.stdout
        except Exception:
            return False

    def stripe_listen(self, forward_url: str = "localhost:3000/api/webhooks/stripe") -> dict:
        """Start Stripe webhook listener."""
        return {
            "command": f"stripe listen --forward-to {forward_url}",
            "note": "Run this in separate terminal"
        }

    # === Supabase Integration ===
    def supabase_status(self) -> dict:
        """Check Supabase project status."""
        try:
            result = subprocess.run(
                ["supabase", "status"],
                capture_output=True,
                text=True,
                check=False
            )
            return {
                "success": result.returncode == 0,
                "output": result.stdout if result.returncode == 0 else result.stderr
            }
        except FileNotFoundError:
            return {"success": False, "error": "Supabase CLI not found"}

    def supabase_gen_types(self, project_id: str) -> dict:
        """Generate TypeScript types from Supabase."""
        cmd = f"supabase gen types typescript --project-id {project_id} > lib/database.types.ts"
        return {"command": cmd, "note": "Run manually in project root"}

    # === Next.js / Build ===
    def build_site(self, project_path: str, framework: str = "nextjs") -> dict:
        """Build web application."""
        cmd_map = {
            "nextjs": ["npm", "run", "build"],
            "react": ["npm", "run", "build"],
            "astro": ["npm", "run", "build"],
            "svelte": ["npm", "run", "build"]
        }
        cmd = cmd_map.get(framework, ["npm", "run", "build"])

        proc_result = subprocess.run(
            cmd,
            cwd=project_path,
            capture_output=True,
            text=True,
            check=False
        )
        return {
            "success": proc_result.returncode == 0,
            "output": proc_result.stdout,
            "errors": proc_result.stderr
        }

    def dev_server_start(self) -> dict:
        """Start development server with Stripe webhook listener."""
        return {
            "commands": [
                "Terminal 1: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
                "Terminal 2: npm run dev"
            ],
            "note": "Run both commands simultaneously"
        }

    # === Deployment ===
    def deploy(self, project_path: str, platform: str = "cloudflare_pages") -> dict:
        """Deploy to specified platform."""
        if platform == "cloudflare_pages":
            proc_result = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=project_path,
                capture_output=True,
                text=True,
                check=False
            )
            return {
                "success": proc_result.returncode == 0,
                "platform": platform,
                "output": proc_result.stdout
            }

        return {"success": False, "error": f"Platform {platform} not supported"}

    def health_check(self, check_url: str) -> dict:
        """Check if site is online."""
        try:
            response = requests.get(check_url, timeout=10)
            return {
                "online": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds()
            }
        except requests.exceptions.RequestException as err:
            return {"online": False, "error": str(err)}

    def fix_deployment(self, project_path: str) -> dict:
        """Auto-fix common deployment issues."""
        fixes = []

        # Fix _headers
        headers_file = Path(project_path) / "_headers"
        if headers_file.exists():
            content = headers_file.read_text()
            if "Referrer-Options" in content:
                content = content.replace("Referrer-Options", "Referrer-Policy")
                headers_file.write_text(content)
                fixes.append("Fixed Referrer-Options typo")

        return {"fixed": len(fixes) > 0, "fixes": fixes}


if __name__ == "__main__":
    skill = WebDevSkill()

    if len(sys.argv) < 2:
        print("OpenClaw Web Dev Skill v2")
        print("=========================")
        print("Commands:")
        print("  ai-generate <prompt> [model]  - Generate code with AI")
        print("  stripe-setup                  - Check Stripe CLI status")
        print("  stripe-listen                 - Show webhook listener command")
        print("  supabase-status               - Check Supabase status")
        print("  build [path]                  - Build Next.js project")
        print("  dev-start                     - Show dev server commands")
        print("  deploy [path]                 - Deploy to Cloudflare")
        print("  health [url]                  - Check site health")
        sys.exit(1)

    command = sys.argv[1]

    if command == "ai-generate":
        prompt = sys.argv[2] if len(sys.argv) > 2 else "Create a React component"
        model = sys.argv[3] if len(sys.argv) > 3 else "qwen3:8b"
        result = skill.generate_code(prompt, model)
        print(json.dumps(result, indent=2))

    elif command == "stripe-setup":
        result = skill.stripe_setup()
        print(json.dumps(result, indent=2))

    elif command == "stripe-listen":
        result = skill.stripe_listen()
        print(json.dumps(result, indent=2))

    elif command == "supabase-status":
        result = skill.supabase_status()
        print(json.dumps(result, indent=2))

    elif command == "build":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = skill.build_site(path)
        print(json.dumps(result, indent=2))

    elif command == "dev-start":
        result = skill.dev_server_start()
        print(json.dumps(result, indent=2))

    elif command == "deploy":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = skill.deploy(path)
        print(json.dumps(result, indent=2))

    elif command == "health":
        url = sys.argv[2] if len(sys.argv) > 2 else "https://bodulica.shop"
        result = skill.health_check(url)
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
