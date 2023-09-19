import { Command } from 'commander';
import { BaseCommandOptions } from '../../core/types/types.js';
import { checkAPIKey } from '../../utils.js';
import Whoami from './commands/whoami.js';
import Login from './commands/login.js';

export default (opts: BaseCommandOptions) => {
  const schema = new Command('auth');
  schema.description('Provides commands for authentication.');
  schema.addCommand(Whoami(opts));
  schema.addCommand(Login(opts));

  schema.hook('preAction', (thisCmd) => {
    if (thisCmd.args.includes('login')) {
      return;
    }
    checkAPIKey();
  });

  return schema;
};
