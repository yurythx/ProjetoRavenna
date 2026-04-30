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
            var handler  = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, _params, out _);
            return principal.FindFirst("user_id")?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }
        catch
        {
            return null;
        }
    }
}
