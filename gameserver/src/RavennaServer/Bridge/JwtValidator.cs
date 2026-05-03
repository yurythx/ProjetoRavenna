// =============================================================================
// JwtValidator.cs — Validação offline de tokens JWT RS256
// =============================================================================
//
// Valida tokens emitidos pelo Django (SimpleJWT + RSA) sem chamada de rede.
// O servidor precisa apenas da chave pública RSA montada em:
//   JWT_PUBLIC_KEY_PATH (default: /app/keys/public.pem)
//
// Dois métodos públicos:
//
//   Validate(token)         — valida assinatura + expiração, retorna user_id
//   ValidateUnityAuth(token) — igual, mas TAMBÉM exige token_type == "unity_auth"
//
// O cliente Unity deve obter um token específico via:
//   POST /api/v1/auth/game-token/
//   Headers: Authorization: Bearer <access_token>
//   Response: { "unity_token": "<jwt com token_type=unity_auth>" }
//
// Esse token separado garante que tokens de API genéricos não podem ser
// usados para autenticar no servidor de jogo — evita vazamento de tokens.
//
// Configuração da chave (docker-compose.yml):
//   volumes:
//     - ./keys/public.pem:/app/keys/public.pem:ro
//
// A chave pública deve ser gerada junto com a privada que o Django usa:
//   openssl genrsa -out private.pem 2048
//   openssl rsa -in private.pem -pubout -out public.pem
// =============================================================================
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace RavennaServer.Bridge;

/// <summary>
/// Validates RS256 JWT tokens offline using the Django backend's RSA public key.
/// No network call required — validation is purely cryptographic.
/// </summary>
internal sealed class JwtValidator
{
    private readonly TokenValidationParameters _params;

    public JwtValidator(string publicKeyPath)
    {
        string pem = File.ReadAllText(publicKeyPath);
        var rsa = RSA.Create();
        rsa.ImportFromPem(pem);

        _params = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new RsaSecurityKey(rsa),
            ValidateIssuer           = false,  // Django does not set iss by default
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.FromSeconds(5),
        };
    }

    /// <summary>
    /// Returns the user ID (sub claim) if the token is valid, or null if not.
    /// </summary>
    public string? Validate(string token)
    {
        try
        {
            var handler   = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, _params, out _);
            return principal.FindFirst("user_id")?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Like Validate, but also enforces that token_type == "unity_auth".
    /// Rejects generic access tokens that were not issued for game login.
    /// </summary>
    public string? ValidateUnityAuth(string token)
    {
        try
        {
            var handler   = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, _params, out _);

            var tokenType = principal.FindFirst("token_type")?.Value;
            if (tokenType != "unity_auth") return null;

            return principal.FindFirst("user_id")?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }
        catch
        {
            return null;
        }
    }
}
