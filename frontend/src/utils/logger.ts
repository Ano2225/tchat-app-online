// Secure logging utility to prevent log injection
class Logger {
  private static sanitize(message: string | number | boolean | object | null | undefined): string {
    try {
      if (typeof message === 'string') {
        return message
          .replace(/[\r\n\t]/g, ' ')
          .replace(/[^\x20-\x7E]/g, '')
          .substring(0, 1000);
      }
      return JSON.stringify(message).substring(0, 1000);
    } catch {
      return '[Invalid message]';
    }
  }

  static info(message: string | number | boolean | object | null | undefined, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.log(`INFO ${contextStr}: ${sanitized}`);
  }

  static error(message: string | number | boolean | object | null | undefined, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.error(`ERROR ${contextStr}: ${sanitized}`);
  }

  static warn(message: string | number | boolean | object | null | undefined, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.warn(`WARN ${contextStr}: ${sanitized}`);
  }

  static debug(message: string | number | boolean | object | null | undefined, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = this.sanitize(message);
      const contextStr = context ? `[${this.sanitize(context)}]` : '';
      console.debug(`DEBUG ${contextStr}: ${sanitized}`);
    }
  }
}

export default Logger;