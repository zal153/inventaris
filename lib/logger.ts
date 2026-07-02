type LogLevel = "INFO" | "WARN" | "ERROR";

const formatMessage = (level: LogLevel, message: string, context?: any) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
};

export const logger = {
  info: (message: string, context?: any) => {
    console.log(formatMessage("INFO", message, context));
  },
  warn: (message: string, context?: any) => {
    console.warn(formatMessage("WARN", message, context));
  },
  error: (message: string, context?: any, error?: any) => {
    let errContext = context || {};
    if (error) {
      errContext = {
        ...errContext,
        error: error.message || String(error),
        stack: error.stack,
      };
    }
    console.error(formatMessage("ERROR", message, errContext));
  },
};

export default logger;
