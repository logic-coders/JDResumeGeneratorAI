"""
Input validation utilities for the AI Resume Agent.
Used during onboarding to validate user-provided fields.
"""

import re
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# ─── Email Validation ──────────────────────────────────────────────

# RFC 5322 simplified — covers 99%+ of real-world email addresses
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an email address.
    Returns (is_valid, error_message).
    """
    email = email.strip()
    if not email:
        return False, "Email address is required."
    if len(email) > 254:
        return False, "Email address is too long (max 254 characters)."
    if not EMAIL_REGEX.match(email):
        return False, f"**{email}** doesn't look like a valid email address. Please enter a valid email (e.g., `name@example.com`)."
    return True, None


# ─── Phone Validation ──────────────────────────────────────────────

# Accepts formats like: +1-234-567-8901, (234) 567-8901, 234.567.8901, +91 98765 43210
PHONE_REGEX = re.compile(
    r"^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{6,15}$"
)


def validate_phone(phone: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a phone number.
    Returns (is_valid, error_message).
    """
    phone = phone.strip()
    if not phone:
        return False, "Phone number is required."
    
    # Remove common separators for digit count check
    digits_only = re.sub(r"[^\d]", "", phone)
    if len(digits_only) < 7:
        return False, f"Phone number **{phone}** seems too short. Please enter a valid phone number with at least 7 digits."
    if len(digits_only) > 15:
        return False, f"Phone number **{phone}** seems too long. Please enter a valid phone number."
    
    if not PHONE_REGEX.match(phone):
        return False, f"**{phone}** doesn't look like a valid phone number. Please enter a valid phone number (e.g., `+1-234-567-8901`)."
    return True, None


# ─── URL Validation ────────────────────────────────────────────────

URL_REGEX = re.compile(
    r"^https?://"  # http:// or https://
    r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain
    r"localhost|"  # localhost
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # or IP
    r"(?::\d+)?"  # optional port
    r"(?:/?|[/?]\S+)$",  # path
    re.IGNORECASE,
)

# Platform-specific patterns for quick validation
LINKEDIN_PATTERN = re.compile(r"(linkedin\.com|lnkd\.in)", re.IGNORECASE)
GITHUB_PATTERN = re.compile(r"github\.com", re.IGNORECASE)
LEETCODE_PATTERN = re.compile(r"leetcode\.com", re.IGNORECASE)


def validate_url(url: str, platform: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate a URL, optionally checking it matches a specific platform.
    
    Args:
        url: The URL to validate.
        platform: Optional platform name ('linkedin', 'github', 'leetcode').
    
    Returns (is_valid, error_message).
    """
    url = url.strip()
    if not url:
        return False, "URL is required."
    
    lower = url.lower()
    if lower in ("skip", "/skip", "none", "no", "n/a", "na", "skip to skip", "skip this", "pass"):
        return False, "Please enter a valid URL, or type `skip` to skip this optional field."
    
    # Auto-prepend https:// if missing
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    
    if not URL_REGEX.match(url):
        return False, f"**{url}** doesn't look like a valid URL. Please enter a valid URL starting with `https://`."
    
    # Platform-specific validation
    if platform:
        platform_checks = {
            "linkedin": (LINKEDIN_PATTERN, "LinkedIn", "https://linkedin.com/in/yourname"),
            "github": (GITHUB_PATTERN, "GitHub", "https://github.com/username"),
            "leetcode": (LEETCODE_PATTERN, "LeetCode", "https://leetcode.com/username"),
        }
        
        if platform.lower() in platform_checks:
            pattern, name, example = platform_checks[platform.lower()]
            if not pattern.search(url):
                return False, f"This doesn't look like a {name} URL. Expected format: `{example}`"
    
    return True, None


# ─── Name Validation ───────────────────────────────────────────────

def validate_name(name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a full name.
    Returns (is_valid, error_message).
    """
    name = name.strip()
    if not name:
        return False, "Name is required."
    if len(name) < 2:
        return False, "Name seems too short. Please enter your full name."
    if len(name) > 100:
        return False, "Name is too long (max 100 characters)."
    if re.search(r"[0-9]", name):
        return False, "Name should not contain numbers. Please enter your full name."
    return True, None


# ─── Location Validation ──────────────────────────────────────────

def validate_location(location: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a location string.
    Returns (is_valid, error_message).
    """
    location = location.strip()
    if not location:
        return False, "Location is required."
    if len(location) < 2:
        return False, "Location seems too short. Please enter your city, state/country."
    if len(location) > 200:
        return False, "Location is too long (max 200 characters)."
    return True, None


# ─── Field Validator Dispatch ──────────────────────────────────────

# Maps field names to their validator functions and optional platform hints
FIELD_VALIDATORS = {
    "name": (validate_name, None),
    "email": (validate_email, None),
    "phone": (validate_phone, None),
    "location": (validate_location, None),
    "linkedin": (validate_url, "linkedin"),
    "github": (validate_url, "github"),
    "leetcode": (validate_url, "leetcode"),
    "portfolio": (validate_url, None),
    "website": (validate_url, None),
}


def validate_field(field_name: str, value: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a field value based on its field name.
    
    Returns (is_valid, error_message).
    If the field has no specific validator, it passes automatically.
    """
    if field_name not in FIELD_VALIDATORS:
        return True, None
    
    validator_func, platform = FIELD_VALIDATORS[field_name]
    if platform:
        return validator_func(value, platform)
    return validator_func(value)
