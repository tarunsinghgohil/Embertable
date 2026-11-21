export const lines = [];

function write(level, msg) {
  const line = `${new Date().toISOString()} ${level} ${msg}`;
  lines.push(line);
  if (process.env.LOG_QUIET !== '1') console.log(line);
}

export const log = {
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
};
