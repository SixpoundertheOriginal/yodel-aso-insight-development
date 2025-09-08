import { describe, expect, test } from "bun:test";
import { filterNavigationByRoutes, type NavigationItem } from "./navigation";
import type { LucideIcon } from "lucide-react";

const DummyIcon = (() => null) as unknown as LucideIcon;

const items: NavigationItem[] = [
  { title: "Allowed", url: "/allowed", icon: DummyIcon, featureKey: "featureA" },
  { title: "Blocked Route", url: "/blocked", icon: DummyIcon, featureKey: "featureA" },
];

describe("filterNavigationByRoutes", () => {
  test("filters items by route and feature for non-demo orgs", () => {
    const result = filterNavigationByRoutes(items, {
      routes: ["/allowed"],
      isDemoOrg: false,
      isSuperAdmin: false,
      hasFeature: key => key === "featureA",
      hasPermission: () => false,
    });
    expect(result.map(i => i.title)).toEqual(["Allowed"]);
  });

  test("removes items without feature access for non-demo orgs", () => {
    const result = filterNavigationByRoutes(items, {
      routes: ["/allowed"],
      isDemoOrg: false,
      isSuperAdmin: false,
      hasFeature: () => false,
      hasPermission: () => false,
    });
    expect(result).toHaveLength(0);
  });

  test("demo orgs bypass feature checks but respect routes", () => {
    const result = filterNavigationByRoutes(items, {
      routes: ["/allowed"],
      isDemoOrg: true,
      isSuperAdmin: false,
      hasFeature: () => false,
      hasPermission: () => false,
    });
    expect(result.map(i => i.title)).toEqual(["Allowed"]);
  });

  test("super admins bypass all checks", () => {
    const result = filterNavigationByRoutes(items, {
      routes: [],
      isDemoOrg: false,
      isSuperAdmin: true,
      hasFeature: () => false,
      hasPermission: () => true,
    });
    expect(result).toHaveLength(2);
  });
});
