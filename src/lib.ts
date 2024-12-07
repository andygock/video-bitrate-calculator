export interface CalculationResult {
  input: string;
  output: string;
}

export const parseInputString = (input: string) => {
  const regexes: { [key: string]: RegExp[] } = {
    fileSize: [/^\d+(?:\.\d+)?(?:B|KB|MB|GB|TB)$/],
    duration: [
      /^\d+(?:\.\d+)?[hms]$/,
      /^\d+:\d+:\d+$/,
      /^\d+:\d+$/,
      /^\d+h(?:\d+m)?(?:\d+s)?$/,
      /^\d+m(?:\d+s)?$/,
    ],
    resolution: [/^\d+x\d+$/],
    frameRate: [/^\d+(?:\.\d+)?fps$/],
    bitRate: [/^\d+(?:\.\d+)?(?:bps|kbps|Mbps|Gbps|k|M|G)$/],
  };
  const unknownTokens: string[] = [];
  const tokens = input
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("/"));
  // console.log("tokens", tokens);

  const parsed: { [key: string]: string } = {};

  tokens.forEach((token) => {
    let matched = false;
    for (const key in regexes) {
      if (regexes[key].some((regex) => regex.test(token))) {
        parsed[key] = token;
        matched = true;
        break;
      }
    }
    if (!matched) {
      unknownTokens.push(token);
    }
  });

  return { parsed, unknownTokens };
};

export const parseInput = (input: string): CalculationResult | string => {
  // inputs are split into groups of numbers and units
  // each input is separated by a space
  // all inputs have a suffix to indicate the unit, except for duration, which can be in the format "hh:mm:ss" or "mm:ss"
  // the units are as follows:
  // - file size: B, KB, MB, GB, TB
  // - duration: h, m, s, or in formats: hh:mm:ss, mm:ss
  // - resolution: width x height e.g "1920x1080"
  // - frame rate: fps
  // - bit rate: bps, kbps, Mbps, Gbps, k, M, G

  try {
    const { parsed, unknownTokens } = parseInputString(input);
    // console.log("parsed", parsed);

    if (unknownTokens.length > 0) {
      throw new Error(`Unknown tokens: ${unknownTokens.join(", ")}`);
    }

    // from bitRate, duration, fileSize, we must have two of them only
    const requiredKeys = ["bitRate", "duration", "fileSize"];

    // find which keys are missing
    const missingKeys = requiredKeys.filter((key) => !(key in parsed));

    // must only be one missing key
    if (missingKeys.length !== 1) {
      throw new Error(
        "Invalid input. Provide at least two parameters to calculate the missing value."
      );
    }

    // inputs as strings, which include the unit if supplied
    const { bitRate, duration, fileSize, resolution, frameRate } = parsed;

    // Parse duration into seconds
    let durationInSeconds = undefined;
    if (duration !== undefined) {
      durationInSeconds = parseDuration(duration);
      if (!durationInSeconds) {
        throw new Error(`Invalid duration format ${duration}`);
      }
    }

    // Calculate missing values

    // missing duration
    if (!durationInSeconds) {
      const calculatedDuration = calculateDuration(
        fileSize,
        bitRate,
        resolution,
        frameRate
      );

      // don't put ':' as calculated duration has its own prefix to indicate the format
      return { input, output: `Duration ${calculatedDuration}` };
    }

    // mising bit rate
    if (!bitRate) {
      const calculatedBitRate = calculateBitRate(
        fileSize,
        durationInSeconds,
        resolution,
        frameRate
      );
      return { input, output: `Bit rate: ${calculatedBitRate}` };
    }

    // missing file size
    if (!fileSize) {
      const calculatedFileSize = calculateFileSize(bitRate, durationInSeconds);
      return { input, output: `File size: ${calculatedFileSize}` };
    }

    throw new Error("All values were provided. Nothing to calculate.");
  } catch (error: unknown) {
    // return error message
    if (error instanceof Error) {
      return {
        input,
        output: `${error.toString()}`,
      };
    } else {
      return {
        input,
        output: "An unknown error occurred.",
      };
    }
  }
};

const parseDuration = (duration: string): number | null => {
  // Handle "nn:nn:nn" and "nn:nn" formats
  if (duration.includes(":")) {
    const parts = duration.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      return null;
    }
  }

  // Handle "1h30m", "90m", "5400s" formats
  const hmsRegex = /(\d+h)?(\d+m)?(\d+s)?/i;
  const match = duration.match(hmsRegex);
  if (!match) return null;

  const [_, hours, minutes, seconds] = match.map((x) => parseInt(x || "0", 10));
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
};

const calculateBitRate = (
  fileSize: string,
  duration: number,
  resolution?: string,
  frameRate?: string
): string => {
  const sizeInBits = parseFileSize(fileSize) * 8;
  const bitRate = sizeInBits / duration;

  let bitsPerPixel = 0;
  if (resolution && frameRate) {
    const [width, height] = resolution.split("x").map(Number);
    const fps = parseInt(frameRate.replace("fps", ""), 10);
    const pixelsPerSecond = width * height * fps;
    bitsPerPixel = bitRate / pixelsPerSecond;
  }

  let result = "";
  if (bitRate >= 1e6) {
    result = `${(bitRate / 1e6).toPrecision(3)} Mbps`;
  } else if (bitRate >= 1e3) {
    result = `${(bitRate / 1e3).toPrecision(3)} kbps`;
  } else {
    result = `${bitRate.toPrecision(3)} bps`;
  }

  result +=
    bitsPerPixel > 0 ? ` (${bitsPerPixel.toPrecision(3)} bits/pixel)` : "";
  return result;
};

const calculateFileSize = (
  bitRate: string,
  duration: number,
  resolution?: string,
  frameRate?: string
): string => {
  const rateInBits = parseBitRate(bitRate);
  let fileSize = rateInBits * duration;

  if (resolution && frameRate) {
    const [width, height] = resolution.split("x").map(Number);
    const fps = parseInt(frameRate.replace("fps", ""), 10);
    const pixelsPerSecond = width * height * fps;
    const bitsPerPixel = rateInBits / pixelsPerSecond;
    fileSize = bitsPerPixel * pixelsPerSecond * duration;
  }

  // return file size string in M, kB, MB, GB, TB
  if (fileSize < 1e3) {
    return `${fileSize} bytes`;
  } else if (fileSize < 1e6) {
    return `${(fileSize / 1e3).toPrecision(3)} kB`;
  } else if (fileSize < 1e9) {
    return `${(fileSize / 1e6).toPrecision(3)} MB`;
  } else if (fileSize < 1e12) {
    return `${(fileSize / 1e9).toPrecision(3)} GB`;
  } else {
    return `${(fileSize / 1e12).toPrecision(3)} TB`;
  }
};

const calculateDuration = (
  fileSize: string,
  bitRate: string,
  resolution?: string,
  frameRate?: string
): string => {
  const sizeInBits = parseFileSize(fileSize) * 8;
  const rateInBits = parseBitRate(bitRate);
  const duration = sizeInBits / rateInBits;

  if (resolution && frameRate) {
    const [width, height] = resolution.split("x").map(Number);
    const fps = parseInt(frameRate.replace("fps", ""), 10);
    const pixelsPerSecond = width * height * fps;
    const bitsPerPixel = rateInBits / pixelsPerSecond;

    // don't with this for now
  }

  // return duration in format "hh:mm:ss"
  if (duration >= 3600) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    return `(hh:mm:ss): ${hours}:${minutes}:${seconds}`;
  } else if (duration >= 60) {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `(mm:ss): ${minutes}:${seconds}`;
  } else {
    return `(s): ${duration}`;
  }
};

const parseFileSize = (fileSize: string): number => {
  const sizeRegex = /(\d+(\.\d+)?)([TGMK]?B?)/i;
  const match = fileSize.match(sizeRegex);
  if (!match) throw new Error("Invalid file size format.");

  const [_, size, , unit] = match;
  const sizeInBytes = parseFloat(size);
  const unitLower = unit.toUpperCase();

  const multiplier =
    unitLower === "TB"
      ? 1e12
      : unitLower === "GB"
      ? 1e9
      : unitLower === "MB"
      ? 1e6
      : unitLower === "KB"
      ? 1e3
      : 1;

  return sizeInBytes * multiplier;
};

const parseBitRate = (bitRate: string): number => {
  const rateRegex = /^(\d+(?:\.\d+)?)(bps|kbps|Mbps|Gbps|k|M|G)$/;
  const match = bitRate.match(rateRegex);
  if (!match) throw new Error("Invalid bit rate format.");

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "k":
    case "kb":
    case "kbps":
      return value * 1e3;
    case "m":
    case "mb":
    case "mbps":
      return value * 1e6;
    case "g":
    case "gb":
    case "gbps":
      return value * 1e9;
    default:
      throw new Error("Unsupported bit rate unit.");
  }
};

export const help = () => {
  // return help text
  return `This is a simple calculator for video encoding parameters.`;
};

export const intro = () => {
  // intro to user on page load
  return `Supply at least two parameters to calculate the missing value.
  Supported parameters:
  - File size: B, KB, MB, GB, TB. e.g "500MB"
  - Duration: h, m, s, or in formats: hh:mm:ss, mm:ss. e.g "1h30m", "90m", "5400s"
  - Bit rate: bps, kbps, Mbps, Gbps, k, M, G. e.g "1Mbps"
`;
};
