const { spawnSync } = require('node:child_process');

function run(command, args, options = {}) {
  const batch = process.platform === 'win32' && /\.(bat|cmd)$/i.test(command);
  const quoteBatchArgument = (value) => {
    if (/["%\r\n]/.test(value)) throw new Error('Unsupported Windows batch argument');
    return `"${value}"`;
  };
  // Explicit cmd invocation avoids Node's implicit shell argument concatenation.
  const executable = batch ? process.env.ComSpec || 'cmd.exe' : command;
  const invocation = batch
    ? ['/d', '/s', '/c', `"${[command, ...args].map(quoteBatchArgument).join(' ')}"`]
    : args;
  const result = spawnSync(executable, invocation, {
    stdio: 'inherit',
    ...options,
    windowsVerbatimArguments: batch,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
  return result;
}

module.exports = { run };
