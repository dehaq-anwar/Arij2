import * as migration_20261018_172504_initial from './20261018_172504_initial';
import * as migration_20261018_224154_content from './20261018_224154_content';
import * as migration_20261019_095903_redesign_c from './20261019_095903_redesign_c';
import * as migration_20261019_113445_forms_privacy_security from './20261019_113445_forms_privacy_security';
import * as migration_20261020_100019_control_center_cc0 from './20261020_100019_control_center_cc0';
import * as migration_20261020_184825_control_center_cc1 from './20261020_184825_control_center_cc1';

export const migrations = [
  {
    up: migration_20261018_172504_initial.up,
    down: migration_20261018_172504_initial.down,
    name: '20261018_172504_initial',
  },
  {
    up: migration_20261018_224154_content.up,
    down: migration_20261018_224154_content.down,
    name: '20261018_224154_content',
  },
  {
    up: migration_20261019_095903_redesign_c.up,
    down: migration_20261019_095903_redesign_c.down,
    name: '20261019_095903_redesign_c',
  },
  {
    up: migration_20261019_113445_forms_privacy_security.up,
    down: migration_20261019_113445_forms_privacy_security.down,
    name: '20261019_113445_forms_privacy_security',
  },
  {
    up: migration_20261020_100019_control_center_cc0.up,
    down: migration_20261020_100019_control_center_cc0.down,
    name: '20261020_100019_control_center_cc0',
  },
  {
    up: migration_20261020_184825_control_center_cc1.up,
    down: migration_20261020_184825_control_center_cc1.down,
    name: '20261020_184825_control_center_cc1'
  },
];
