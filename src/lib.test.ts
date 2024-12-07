import { parseInput, parseInputString, CalculationResult } from "./lib";

describe("parseInputString", () => {
  test.each([
    ["500MB", { parsed: { fileSize: "500MB" }, unknownTokens: [] }],
    ["30m", { parsed: { duration: "30m" }, unknownTokens: [] }],
    ["30.5m", { parsed: { duration: "30.5m" }, unknownTokens: [] }],
    ["1h30m", { parsed: { duration: "1h30m" }, unknownTokens: [] }],
    ["1h30m20s", { parsed: { duration: "1h30m20s" }, unknownTokens: [] }],
    ["1920x1080", { parsed: { resolution: "1920x1080" }, unknownTokens: [] }],
    ["25fps", { parsed: { frameRate: "25fps" }, unknownTokens: [] }],
    ["1Mbps", { parsed: { bitRate: "1Mbps" }, unknownTokens: [] }],
    ["1.5Mbps", { parsed: { bitRate: "1.5Mbps" }, unknownTokens: [] }],
    ["1M", { parsed: { bitRate: "1M" }, unknownTokens: [] }],
    ["unknown", { parsed: {}, unknownTokens: ["unknown"] }],
    [
      "500MB unknown",
      { parsed: { fileSize: "500MB" }, unknownTokens: ["unknown"] },
    ],
  ])('should parse input "%s"', (input, expectedOutput) => {
    const result = parseInputString(input);
    expect(result).toEqual(expectedOutput);
  });
});
