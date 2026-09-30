import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * One JSON object per line in production so Docker, Loki, CloudWatch, or any log shipper can index
 * level, context, and request id without regex. Development keeps the readable coloured output.
 */
export class JsonLogger extends ConsoleLogger {
  private readonly json = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';

  protected printMessages(messages: unknown[], context = '', logLevel: LogLevel = 'log', writeStreamType?: 'stdout' | 'stderr') {
    if (!this.json) {
      super.printMessages(messages, context, logLevel, writeStreamType);
      return;
    }

    const stream = writeStreamType === 'stderr' ? process.stderr : process.stdout;
    for (const message of messages) {
      const entry: Record<string, unknown> = {
        time: new Date().toISOString(),
        level: logLevel,
        context,
        service: 'sombetini-api',
      };
      if (message instanceof Error) {
        entry.message = message.message;
        entry.stack = message.stack;
      } else if (typeof message === 'object' && message !== null) {
        Object.assign(entry, message as Record<string, unknown>);
      } else {
        entry.message = String(message);
      }
      stream.write(`${JSON.stringify(entry)}\n`);
    }
  }
}
