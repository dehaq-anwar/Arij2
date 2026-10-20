import { RscEntryLexicalCell as RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { RscEntryLexicalField as RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { LexicalDiffComponent as LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e } from '@payloadcms/richtext-lexical/rsc'
import { InlineToolbarFeatureClient as InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { FixedToolbarFeatureClient as FixedToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { HorizontalRuleFeatureClient as HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { BlockquoteFeatureClient as BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { OrderedListFeatureClient as OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { UnorderedListFeatureClient as UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { LinkFeatureClient as LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { BoldFeatureClient as BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { ItalicFeatureClient as ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { HeadingFeatureClient as HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { ParagraphFeatureClient as ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864 } from '@payloadcms/richtext-lexical/client'
import { DisabledCell as DisabledCell_be9a4542cb71595e74a250e28967df07 } from '../../../cms/admin/users/cells'
import { MfaCell as MfaCell_be9a4542cb71595e74a250e28967df07 } from '../../../cms/admin/users/cells'
import { AccountSecurity as AccountSecurity_eea8bb4c27f84aa89907bc0b4d500d7a } from '../../../cms/admin/users/AccountSecurity'
import { ActionCell as ActionCell_39956808fc2b085914ca05e7ecec4fcf } from '../../../cms/admin/audit/ActionCell'
import { ActorCell as ActorCell_be9a4542cb71595e74a250e28967df07 } from '../../../cms/admin/users/cells'
import { TargetCell as TargetCell_be9a4542cb71595e74a250e28967df07 } from '../../../cms/admin/users/cells'
import { Nav as Nav_12334e1e8e715cb5d5b2ff7d509c6d0b } from '../../../cms/admin/nav/Nav'
import { Icon as Icon_93a9ecdfc1feebac9bd452b39417c04f } from '../../../cms/admin/brand/Brand'
import { Logo as Logo_93a9ecdfc1feebac9bd452b39417c04f } from '../../../cms/admin/brand/Brand'
import { AdminProvider as AdminProvider_9f4b0df6dbd67dc6fa77fe9a8fa1803f } from '../../../cms/admin/AdminProvider'
import { SignInView as SignInView_ab81c8558823ad62f7080ac33b4a4e34 } from '../../../cms/admin/sign-in/SignInView'
import { Dashboard as Dashboard_ac5e73e07aaecf4a73df6823b5fd3dfb } from '../../../cms/admin/dashboard/Dashboard'
import { SecurityView as SecurityView_0b430472f5a085374ca8d837efe1e8a3 } from '../../../cms/admin/security/SecurityView'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell": RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField": RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/rsc#LexicalDiffComponent": LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e,
  "@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient": InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#FixedToolbarFeatureClient": FixedToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#HorizontalRuleFeatureClient": HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#BlockquoteFeatureClient": BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#OrderedListFeatureClient": OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#UnorderedListFeatureClient": UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#LinkFeatureClient": LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#BoldFeatureClient": BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#ItalicFeatureClient": ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#HeadingFeatureClient": HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "@payloadcms/richtext-lexical/client#ParagraphFeatureClient": ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
  "/cms/admin/users/cells#DisabledCell": DisabledCell_be9a4542cb71595e74a250e28967df07,
  "/cms/admin/users/cells#MfaCell": MfaCell_be9a4542cb71595e74a250e28967df07,
  "/cms/admin/users/AccountSecurity#AccountSecurity": AccountSecurity_eea8bb4c27f84aa89907bc0b4d500d7a,
  "/cms/admin/audit/ActionCell#ActionCell": ActionCell_39956808fc2b085914ca05e7ecec4fcf,
  "/cms/admin/users/cells#ActorCell": ActorCell_be9a4542cb71595e74a250e28967df07,
  "/cms/admin/users/cells#TargetCell": TargetCell_be9a4542cb71595e74a250e28967df07,
  "/cms/admin/nav/Nav#Nav": Nav_12334e1e8e715cb5d5b2ff7d509c6d0b,
  "/cms/admin/brand/Brand#Icon": Icon_93a9ecdfc1feebac9bd452b39417c04f,
  "/cms/admin/brand/Brand#Logo": Logo_93a9ecdfc1feebac9bd452b39417c04f,
  "/cms/admin/AdminProvider#AdminProvider": AdminProvider_9f4b0df6dbd67dc6fa77fe9a8fa1803f,
  "/cms/admin/sign-in/SignInView#SignInView": SignInView_ab81c8558823ad62f7080ac33b4a4e34,
  "/cms/admin/dashboard/Dashboard#Dashboard": Dashboard_ac5e73e07aaecf4a73df6823b5fd3dfb,
  "/cms/admin/security/SecurityView#SecurityView": SecurityView_0b430472f5a085374ca8d837efe1e8a3,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
