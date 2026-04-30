"""
Script to generate RSA key pair for JWT signing.
Run: python manage.py shell < keys/generate_keys.py
"""
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from pathlib import Path

keys_dir = Path(__file__).resolve().parent

private_path = keys_dir / "private.pem"
public_path = keys_dir / "public.pem"

if private_path.exists() and public_path.exists():
    print("RSA key pair already exists.")
    print(f"Private key: {private_path}")
    print(f"Public key: {public_path}")
    raise SystemExit(0)

private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
)

public_key = private_key.public_key()
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

private_path.write_bytes(private_pem)
public_path.write_bytes(public_pem)

print("RSA key pair generated successfully!")
print(f"Private key: {private_path}")
print(f"Public key: {public_path}")
