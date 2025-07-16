
import { chartColors, chartConfig } from "./chartConfig";

describe("Chart Configuration", () => {
  test("chartColors should contain all required color definitions", () => {
    expect(chartColors).toHaveProperty("impressions");
    expect(chartColors).toHaveProperty("downloads");
    expect(chartColors).toHaveProperty("pageViews");
    expect(chartColors).toHaveProperty("current");
    expect(chartColors).toHaveProperty("previous");
  });
  
  test("chartConfig should contain grid, axis, and tooltip configurations", () => {
    expect(chartConfig).toHaveProperty("grid");
    expect(chartConfig).toHaveProperty("axis");
    expect(chartConfig).toHaveProperty("tooltip");
    expect(chartConfig).toHaveProperty("height");
  });
  
  test("chartConfig values should have the expected structure", () => {
    expect(chartConfig.grid).toHaveProperty("strokeDasharray");
    expect(chartConfig.grid).toHaveProperty("stroke");
    expect(chartConfig.axis).toHaveProperty("tick");
    expect(chartConfig.axis).toHaveProperty("line");
    expect(chartConfig.tooltip).toHaveProperty("background");
    expect(chartConfig.tooltip).toHaveProperty("border");
    expect(chartConfig.tooltip).toHaveProperty("text");
  });
});
