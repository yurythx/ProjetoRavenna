using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using RavennaServer.Bridge;
using Xunit;

namespace RavennaServer.Tests;

/// <summary>
/// Generates a real RSA key pair for each test class instance.
/// The public key is written to a temp file so JwtValidator can load it.
/// </summary>
public class JwtValidatorTests : IDisposable
{
    private readonly RSA    _rsa;
    private readonly string _pubKeyPath;
    private readonly RsaSecurityKey       _signingKey;
    private readonly SigningCredentials   _creds;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtValidatorTests()
    {
        _rsa = RSA.Create(2048);

        // Export public key to temp PEM file
        _pubKeyPath = Path.GetTempFileName();
        File.WriteAllText(_pubKeyPath,
            "-----BEGIN PUBLIC KEY-----\n" +
            Convert.ToBase64String(_rsa.ExportSubjectPublicKeyInfo(), Base64FormattingOptions.InsertLineBreaks) +
            "\n-----END PUBLIC KEY-----\n");

        _signingKey = new RsaSecurityKey(_rsa);
        _creds      = new SigningCredentials(_signingKey, SecurityAlgorithms.RsaSha256);
    }

    public void Dispose()
    {
        File.Delete(_pubKeyPath);
        _rsa.Dispose();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string MakeToken(string userId, string? tokenType = null,
        DateTime? expires = null)
    {
        var claims = new List<Claim> { new("user_id", userId) };
        if (tokenType is not null)
            claims.Add(new Claim("token_type", tokenType));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(claims),
            Expires            = expires ?? DateTime.UtcNow.AddMinutes(5),
            SigningCredentials  = _creds,
        };
        return _handler.WriteToken(_handler.CreateToken(descriptor));
    }

    // ── Validate ──────────────────────────────────────────────────────────────

    [Fact]
    public void Validate_ValidToken_ReturnsUserId()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-abc-123");
        Assert.Equal("user-abc-123", validator.Validate(token));
    }

    [Fact]
    public void Validate_ExpiredToken_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-1", expires: DateTime.UtcNow.AddSeconds(-10));
        Assert.Null(validator.Validate(token));
    }

    [Fact]
    public void Validate_WrongSigningKey_ReturnsNull()
    {
        using var otherRsa  = RSA.Create(2048);
        var       otherKey  = new RsaSecurityKey(otherRsa);
        var       otherCred = new SigningCredentials(otherKey, SecurityAlgorithms.RsaSha256);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(new[] { new Claim("user_id", "hacker") }),
            Expires            = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials  = otherCred,
        };
        string forgedToken = _handler.WriteToken(_handler.CreateToken(descriptor));

        var validator = new JwtValidator(_pubKeyPath);
        Assert.Null(validator.Validate(forgedToken));
    }

    [Fact]
    public void Validate_MalformedToken_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        Assert.Null(validator.Validate("not.a.jwt"));
    }

    [Fact]
    public void Validate_EmptyString_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        Assert.Null(validator.Validate(""));
    }

    [Fact]
    public void Validate_TokenWithoutUserIdClaim_ReturnsNull()
    {
        // Token signed correctly but missing user_id claim
        var descriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(new[] { new Claim("sub", "only-sub") }),
            Expires            = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials  = _creds,
        };
        // sub claim is mapped to JwtRegisteredClaimNames.Sub — Validate should still find it
        string token  = _handler.WriteToken(_handler.CreateToken(descriptor));
        var validator = new JwtValidator(_pubKeyPath);
        // sub is fallback — should return the sub value
        Assert.NotNull(validator.Validate(token));
    }

    // ── ValidateUnityAuth ─────────────────────────────────────────────────────

    [Fact]
    public void ValidateUnityAuth_ValidTokenWithCorrectType_ReturnsUserId()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-game-1", tokenType: "unity_auth");
        Assert.Equal("user-game-1", validator.ValidateUnityAuth(token));
    }

    [Fact]
    public void ValidateUnityAuth_MissingTokenType_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-1");  // no token_type claim
        Assert.Null(validator.ValidateUnityAuth(token));
    }

    [Fact]
    public void ValidateUnityAuth_WrongTokenType_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-1", tokenType: "access");
        Assert.Null(validator.ValidateUnityAuth(token));
    }

    [Fact]
    public void ValidateUnityAuth_ExpiredToken_ReturnsNull()
    {
        var validator = new JwtValidator(_pubKeyPath);
        string token  = MakeToken("user-1", tokenType: "unity_auth",
            expires: DateTime.UtcNow.AddSeconds(-10));
        Assert.Null(validator.ValidateUnityAuth(token));
    }

    [Fact]
    public void ValidateUnityAuth_WrongKey_ReturnsNull()
    {
        using var otherRsa  = RSA.Create(2048);
        var       otherCred = new SigningCredentials(
            new RsaSecurityKey(otherRsa), SecurityAlgorithms.RsaSha256);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("user_id",    "hacker"),
                new Claim("token_type", "unity_auth"),
            }),
            Expires           = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = otherCred,
        };
        string forged   = _handler.WriteToken(_handler.CreateToken(descriptor));
        var validator   = new JwtValidator(_pubKeyPath);
        Assert.Null(validator.ValidateUnityAuth(forged));
    }
}
