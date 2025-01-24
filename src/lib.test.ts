import {
  parseInput,
  parseInputString,
  parseDuration,
  parseBitRate,
  parseFileSize,
} from "./lib";

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

describe("parseDuration", () => {
  test.each([
    ["00:30", 30],
    ["01:30", 90],
    ["01:01:01", 3661],
    ["1h30m", 5400],
    ["90m", 5400],
    ["5400s", 5400],
    ["1h", 3600],
    ["30m", 1800],
    ["45s", 45],
    ["45seconds", null],
    ["invalid", null],
    ["1h30m20s", 5420],
    ["", null],
  ])('parses "%s" to %d', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
});

describe("parseFileSize", () => {
  test.each([
    ["1TB", 1e12],
    ["500GB", 5e11],
    ["1.5GB", 1.5e9],
    ["750MB", 7.5e8],
    ["1KB", 1e3],
    ["500B", 500],
    ["1.25MB", 1.25e6],
    ["2.5KB", 2.5e3],

    // test binary units too
    ["1TiB", 1099511627776],
    ["1GiB", 1073741824],
    ["1MiB", 1048576],
    ["1KiB", 1024],
  ])('parses "%s" to %d bytes', (input, expected) => {
    expect(parseFileSize(input)).toBe(expected);
  });

  // test these invalid formats
  const invalid = ["100", "200kg", "1TBps", "foobar"];

  test.each(invalid)("throws error for invalid format: %s", (input) => {
    expect(() => parseFileSize(input)).toThrow("Invalid file size format.");
  });
});

describe("parseBitRate", () => {
  test.each([
    ["1kbps", 1e3],
    ["1Mbps", 1e6],
    ["1Gbps", 1e9],
    ["1k", 1e3],
    ["1M", 1e6],
    ["1G", 1e9],
    ["500kbps", 500e3],
    ["2.5Mbps", 2.5e6],
    ["0.5Gbps", 0.5e9],
  ])('parses "%s" to %d bps', (input, expected) => {
    expect(parseBitRate(input)).toBe(expected);
  });

  test("throws error for invalid format", () => {
    expect(() => parseBitRate("invalid")).toThrow("Unsupported bit rate unit.");
  });

  test("throws error for unsupported unit", () => {
    expect(() => parseBitRate("1tbps")).toThrow("Unsupported bit rate unit.");
  });
});

describe("parseInput", () => {
  test("should throw error for unknown tokens", () => {
    const input = "10X 20Y";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: "Error: Unknown tokens: 10X, 20Y",
    });
  });

  test("should throw error if less than two required parameters are provided", () => {
    const input = "500kbps";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output:
        "Error: Provide only two parameters to calculate the missing value.",
    });
  });

  test("should throw error if less than two required parameters are provided", () => {
    const input = "99:99:99";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output:
        "Error: Provide only two parameters to calculate the missing value.",
    });
  });

  test("should throw error if all values are provided", () => {
    const input = "500kbps 00:02:00 10MB";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: "Error: All values were provided. Nothing to calculate.",
    });
  });

  test("should calculate missing duration", () => {
    const input = "500kbps 10MB";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: expect.stringContaining("Duration"),
    });
  });

  test("should calculate missing bit rate", () => {
    const input = "00:02:00 10MB";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: expect.stringContaining("Bit rate"),
    });
  });

  test("should calculate missing file size", () => {
    const input = "500kbps 00:02:00";
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: expect.stringContaining("File size"),
    });
  });
});

describe("calculateBitRate", () => {
  // check for correct calculations

  // bitrates
  test.each([
    ["700MB 2h", "778 kbps"],
    ["700MiB 2h", "816 kbps"],
  ])("should calculate correct bitrates for %s", (input, expectedOutput) => {
    const result = parseInput(input);
    expect(result).toEqual({
      input,
      output: `Bit rate: ${expectedOutput}`,
    });
  });

  // durations
  test.each([["700MB 777.77777kbps", "2:00:00"]])(
    "should calculate correct durations for %s",
    (input, expectedOutput) => {
      const result = parseInput(input);
      expect(result).toEqual({
        input,
        output: `Duration (hh:mm:ss): ${expectedOutput}`,
      });
    }
  );

  // file sizes
  test.each([["777.77777kbps 2h", "700 MB"]])(
    "should calculate correct file sizes for %s",
    (input, expectedOutput) => {
      const result = parseInput(input);
      expect(result).toEqual({
        input,
        output: `File size: ${expectedOutput}`,
      });
    }
  );
});
