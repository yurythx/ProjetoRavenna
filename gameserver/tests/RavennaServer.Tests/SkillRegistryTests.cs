using RavennaServer.Simulation;
using Xunit;

namespace RavennaServer.Tests;

public class SkillRegistryTests
{
    [Fact]
    public void All_Returns8Skills()
    {
        Assert.Equal(8, SkillRegistry.All.Count());
    }

    [Theory]
    [InlineData(1u)]  // Power Strike
    [InlineData(2u)]  // Whirlwind
    [InlineData(3u)]  // Arrow Rain
    [InlineData(4u)]  // Piercing Shot
    [InlineData(5u)]  // Fireball
    [InlineData(6u)]  // Ice Lance
    [InlineData(7u)]  // Heal
    [InlineData(8u)]  // Battle Cry
    public void TryGet_ValidSkillId_ReturnsTrue(uint id)
    {
        Assert.True(SkillRegistry.TryGet(id, out _));
    }

    [Theory]
    [InlineData(0u)]
    [InlineData(9u)]
    [InlineData(999u)]
    public void TryGet_InvalidSkillId_ReturnsFalse(uint id)
    {
        Assert.False(SkillRegistry.TryGet(id, out _));
    }

    [Fact]
    public void PowerStrike_DamageMultiplierGreaterThanOne()
    {
        SkillRegistry.TryGet(1u, out var skill);
        Assert.True(skill!.DamageMultiplier > 1.0f);
    }

    [Fact]
    public void HealSkill_HealAmountGreaterThanZero()
    {
        SkillRegistry.TryGet(7u, out var skill);
        Assert.True(skill!.HealAmount > 0);
    }

    [Fact]
    public void HealSkill_TargetingSelf()
    {
        SkillRegistry.TryGet(7u, out var skill);
        Assert.Equal(SkillTargeting.Self, skill!.Targeting);
    }

    [Fact]
    public void Whirlwind_IsAreaOfEffect()
    {
        SkillRegistry.TryGet(2u, out var skill);
        Assert.Equal(SkillTargeting.AreaOfEffect, skill!.Targeting);
        Assert.True(skill.AoeRadius > 0);
    }

    [Fact]
    public void AllSkills_HaveCooldownGreaterThanZero()
    {
        foreach (var skill in SkillRegistry.All)
            Assert.True(skill.CooldownSec > 0f, $"Skill {skill.SkillId} has zero cooldown");
    }

    [Fact]
    public void AllSkills_HaveNonEmptyName()
    {
        foreach (var skill in SkillRegistry.All)
            Assert.False(string.IsNullOrWhiteSpace(skill.Name), $"Skill {skill.SkillId} has no name");
    }

    [Fact]
    public void AllSkills_HaveUniqueIds()
    {
        var ids = SkillRegistry.All.Select(s => s.SkillId).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public void TryGet_OutputMatchesSkillId()
    {
        SkillRegistry.TryGet(5u, out var skill);
        Assert.Equal(5u, skill!.SkillId);
    }
}
