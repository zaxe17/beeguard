"""
Creates (or resets) the BeeGuard admin account.

Run from the `server` folder, with your venv active:

    python scripts/create_admin.py

Optional — your own email/password:

    python scripts/create_admin.py --email you@example.com --password "YourStrongPass1!"

If the email already exists in `admins`, its password is reset and the
account is set back to Active. The password is stored bcrypt-hashed,
same as every other account (AuthService.hash_password).
"""
import argparse
import os
import sys

# Make `config`, `services`, `utils` importable when run as a script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import Database          # noqa: E402
from services.auth_service import AuthService  # noqa: E402
from utils.id_generator import next_user_id    # noqa: E402

DEFAULT_EMAIL = "admin@beeguard.com"
DEFAULT_PASSWORD = "BeeGuard@Admin2026"
DEFAULT_NAME = "BeeGuard Admin"
DEFAULT_ADDRESS = "Bureau of Animal Industry, Quezon City"
DEFAULT_CONTACT = "09000000000"


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or reset the BeeGuard admin account.")
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--name", default=DEFAULT_NAME)
    args = parser.parse_args()

    if len(args.password) < 8:
        sys.exit("Password must be at least 8 characters.")

    Database.init_pool()
    hashed = AuthService.hash_password(args.password)

    conn = Database.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT adminID FROM admins WHERE email = %s LIMIT 1", (args.email,))
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE admins
                    SET password = %s, status = 'Active', deleted_at = NULL
                    WHERE email = %s
                    """,
                    (hashed, args.email),
                )
                admin_id = existing["adminID"]
                action = "Password reset for existing admin"
            else:
                admin_id = next_user_id(conn, "admin")
                cur.execute(
                    """
                    INSERT INTO admins
                        (adminID, admin_name, address, password, contact_no, email, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'Active')
                    """,
                    (admin_id, args.name, DEFAULT_ADDRESS, hashed, DEFAULT_CONTACT, args.email),
                )
                action = "Created admin"
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"{action}: {admin_id}")
    print(f"  Email:    {args.email}")
    print(f"  Password: {args.password}")
    print("Log in with these on the normal login page — you'll be taken to the admin side.")


if __name__ == "__main__":
    main()