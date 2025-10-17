// Secure logging utility to prevent log injection
class Logger {
  private static sanitize(message: any): string {
    if (typeof message === 'string') {
      return message
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[^\x20-\x7E]/g, '')
        .substring(0, 1000);
    }
    return JSON.stringify(message).substring(0, 1000);
  }

  static info(message: any, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.log(`INFO ${contextStr}: ${sanitized}`);
  }

  static error(message: any, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.error(`ERROR ${contextStr}: ${sanitized}`);
  }

  static warn(message: any, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${this.sanitize(context)}]` : '';
    console.warn(`WARN ${contextStr}: ${sanitized}`);
  }

  static debug(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = this.sanitize(message);
      const contextStr = context ? `[${this.sanitize(context)}]` : '';
      console.debug(`DEBUG ${contextStr}: ${sanitized}`);
    }
  }
}

export default Logger;