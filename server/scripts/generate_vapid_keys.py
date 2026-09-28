"""
Makes the VAPID key pair that push notifications need (run ONCE).

    python scripts/generate_vapid_keys.py

It prints three lines — paste them into server/.env, and paste the
VAPID_PUBLIC_KEY line into the frontend's .env.local as
NEXT_PUBLIC_VAPID_PUBLIC_KEY (the frontend also fetches it from the
backend, so that one is optional).

Keep VAPID_PRIVATE_KEY secret. If you ever change the keys, everyone's
browser has to turn notifications on again.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_raw = private_key.private_numbers().private_value.to_bytes(32, "big")
    public_raw = private_key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )

    print("# ── paste into server/.env ──")
    print(f"VAPID_PUBLIC_KEY={b64url(public_raw)}")
    print(f"VAPID_PRIVATE_KEY={b64url(private_raw)}")
    print("VAPID_SUBJECT=mailto:admin@beeguard.com")


if __name__ == "__main__":
    main()