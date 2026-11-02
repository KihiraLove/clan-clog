import * as appText from '@clog/domain';
/** Guild slash-command contract; registration is always an explicit operation. */
import { SlashCommandBuilder } from 'discord.js';

export const collectionLogCommand = new SlashCommandBuilder()
  .setName('cc-clog')
  .setDescription(appText.botCommandClanCollectionLog)
  .addSubcommand((command) =>
    command
      .setName('submit')
      .setDescription(
        appText.botCommandSubmitProofOfACollectedItemForAdminReview,
      )
      .addStringOption((option) =>
        option
          .setName('item')
          .setDescription(
            appText.botCommandChooseAnItemOrTypeItsNameForManualMatching,
          )
          .setRequired(true)
          .setAutocomplete(true)
          .setMaxLength(200),
      )
      .addAttachmentOption((option) =>
        option
          .setName('screenshot')
          .setDescription(appText.botCommandPngScreenshotProofUpTo10MiB)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('submitter-name')
          .setDescription(
            appText.botCommandCollectorNameDefaultsToYourDiscordDisplayName,
          )
          .setMaxLength(80),
      )
      .addBooleanOption((option) =>
        option
          .setName('hardcore')
          .setDescription(
            appText.botCommandClaimTheItemWasObtainedOnHardcoreWorldsDefaultNo,
          ),
      ),
  );
