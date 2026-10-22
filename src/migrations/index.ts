import * as migration_20261018_172504_initial from './20261018_172504_initial';
import * as migration_20261018_224154_content from './20261018_224154_content';
import * as migration_20261019_095903_redesign_c from './20261019_095903_redesign_c';
import * as migration_20261019_113445_forms_privacy_security from './20261019_113445_forms_privacy_security';
import * as migration_20261020_100019_control_center_cc0 from './20261020_100019_control_center_cc0';
import * as migration_20261020_184825_control_center_cc1 from './20261020_184825_control_center_cc1';
import * as migration_20261021_124324_cc2_export_purposes from './20261021_124324_cc2_export_purposes';
import * as migration_20261021_125807_cc2_member_review from './20261021_125807_cc2_member_review';
import * as migration_20261021_133111_cc2_display_titles from './20261021_133111_cc2_display_titles';
import * as migration_20261021_135132_cc2_pages from './20261021_135132_cc2_pages';
import * as migration_20261021_141353_cc2_publishing from './20261021_141353_cc2_publishing';
import * as migration_20261021_233818_cc3_operations from './20261021_233818_cc3_operations';

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
    name: '20261020_184825_control_center_cc1',
  },
  {
    up: migration_20261021_124324_cc2_export_purposes.up,
    down: migration_20261021_124324_cc2_export_purposes.down,
    name: '20261021_124324_cc2_export_purposes',
  },
  {
    up: migration_20261021_125807_cc2_member_review.up,
    down: migration_20261021_125807_cc2_member_review.down,
    name: '20261021_125807_cc2_member_review',
  },
  {
    up: migration_20261021_133111_cc2_display_titles.up,
    down: migration_20261021_133111_cc2_display_titles.down,
    name: '20261021_133111_cc2_display_titles',
  },
  {
    up: migration_20261021_135132_cc2_pages.up,
    down: migration_20261021_135132_cc2_pages.down,
    name: '20261021_135132_cc2_pages',
  },
  {
    up: migration_20261021_141353_cc2_publishing.up,
    down: migration_20261021_141353_cc2_publishing.down,
    name: '20261021_141353_cc2_publishing',
  },
  {
    up: migration_20261021_233818_cc3_operations.up,
    down: migration_20261021_233818_cc3_operations.down,
    name: '20261021_233818_cc3_operations'
  },
];
