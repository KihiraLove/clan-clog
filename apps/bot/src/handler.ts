import * as appText from '@clog/domain';
/** Discord is an adapter; only an API 200/201 may produce a saved receipt. */
import { WorkloadError, type OperationalDiagnostics } from '@clog/domain';
import { type BotWorkloads, searchRetryChoice } from './workloads.js';
import {
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import {
  BotApiError,
  UnconfirmedSubmissionError,
  botFailure,
  type BotApi,
  type Receipt,
} from './api.js';
import { closedCollectionPageMessage } from '@clog/domain';
import { ScreenshotError, validateScreenshot } from './screenshot.js';

export function collectorSnapshot(
  member: ChatInputCommandInteraction['member'],
  username: string,
  explicit: string | null,
): string {
  if (explicit !== null) return explicit.trim();
  if (
    member &&
    'displayName' in member &&
    typeof member.displayName === 'string' &&
    member.displayName.trim()
  )
    return member.displayName.trim();
  if (
    member &&
    'nick' in member &&
    typeof member.nick === 'string' &&
    member.nick.trim()
  )
    return member.nick.trim();
  return username;
}
const submissionSuccessMessage = appText.botHandlerItemSubmittedToReview;
/** Discord snowflakes are safe operator correlation IDs, not bearer credentials. */
function interactionReference(id: string | undefined): string {
  return id && /^\d{17,20}$/u.test(id)
    ? appText.botHandlerDiscordInteractionId(id)
    : '';
}

function unconfirmedMessage(interactionId?: string): string {
  return appText.botHandlerSubmissionCouldNotBeConfirmedItMightHaveReachedThe(
    interactionReference(interactionId),
  );
}

export function failureMessage(error: unknown, interactionId?: string): string {
  if (error instanceof ScreenshotError)
    return appText.botHandlerNothingWasSentToTheSubmissionService(
      error.message,
    );
  if (error instanceof UnconfirmedSubmissionError)
    return unconfirmedMessage(error.interactionId);
  if (error instanceof BotApiError) {
    if (error.status === 403 && error.message === closedCollectionPageMessage)
      return closedCollectionPageMessage;
    if (error.status === 409)
      return appText.botHandlerThisDiscordInteractionIdWasAlreadySubmittedWithDifferentDetails;
    if ([400, 413, 415, 422].includes(error.status))
      return appText.botHandlerTheSubmittedItemDateOrProofWasRejectedByThe;
    if (error.status === 403 || error.status === 401)
      return appText.botHandlerTheSubmissionServiceRejectedTheConfiguredBotCredentialsOrGuild;
    if (error.status === 429)
      return appText.botHandlerTheSubmissionServiceIsTemporarilyRateLimitedNoReceiptCould;
  }
  return unconfirmedMessage(interactionId);
}
export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  api: BotApi,
  guildId: string,
  workloads?: BotWorkloads,
  diagnostics?: OperationalDiagnostics,
): Promise<void> {
  if (
    interaction.guildId !== guildId ||
    interaction.commandName !== 'cc-clog' ||
    interaction.options.getSubcommand(false) !== 'submit' ||
    interaction.options.getFocused(true).name !== 'item'
  ) {
    await interaction.respond([]);
    return;
  }
  let release: (() => void) | undefined;
  try {
    release = workloads?.search.acquire([
      guildId,
      guildId + ':' + interaction.user.id,
    ]);
    const search = interaction.options.getFocused();
    const items = await api.search(String(search).slice(0, 200));
    await interaction.respond(
      items.slice(0, 25).map((item) => ({
        name: item.name.slice(0, 100),
        value: 'item:' + item.id,
      })),
    );
  } catch (error) {
    diagnostics?.record('failure', {
      operation: 'autocomplete',
      ...botFailure(error),
      correlation: interaction.id,
    });
    // Search failure cannot imply a successful match; free-text remains available.
    if (!interaction.responded)
      await interaction
        .respond(
          error instanceof WorkloadError
            ? [
                {
                  name: appText.botHandlerSearchBusyWaitSOrTypeAnItemName(
                    error.retryAfterSeconds,
                  ),
                  value: searchRetryChoice,
                },
              ]
            : [],
        )
        .catch(() =>
          diagnostics?.record('failure', {
            operation: 'autocomplete',
            category: 'acknowledgement',
            code: 'ACK_FAILED',
            correlation: interaction.id,
          }),
        );
  } finally {
    release?.();
  }
}
export async function handleSubmission(
  interaction: ChatInputCommandInteraction,
  api: BotApi,
  guildId: string,
  workloads?: BotWorkloads,
  diagnostics?: OperationalDiagnostics,
): Promise<void> {
  // Defer before doing any network I/O, including catalog lookups.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (interaction.guildId !== guildId) {
    await interaction.editReply(
      appText.botHandlerThisCommandCanOnlyBeUsedInTheConfiguredClan,
    );
    return;
  }
  let release: (() => void) | undefined;
  let saved: Receipt | undefined;
  try {
    release = workloads?.intake.acquire([
      guildId,
      guildId + ':' + interaction.user.id,
    ]);
    const rawItemText = interaction.options.getString('item', true);
    if (rawItemText === searchRetryChoice) {
      await interaction.editReply(
        appText.botHandlerItemSearchWasBusyWaitAFewSecondsThenSearch,
      );
      return;
    }
    const screenshot = interaction.options.getAttachment('screenshot');
    if (!screenshot)
      throw new ScreenshotError(
        appText.botHandlerAttachAPngScreenshotIfThisOptionIsMissingAsk,
      );
    validateScreenshot(screenshot);
    const collectorName = collectorSnapshot(
      interaction.member,
      interaction.user.username,
      interaction.options.getString('submitter-name'),
    );
    const hardcore = interaction.options.getBoolean('hardcore') ?? false;
    if (
      !rawItemText.trim() ||
      rawItemText.length > 200 ||
      !collectorName ||
      collectorName.length > 80
    ) {
      await interaction.editReply(
        appText.botHandlerUseANonblankItemAndACollectorNameUpTo,
      );
      return;
    }
    const choice = /^item:([1-9]\d*)$/u.exec(rawItemText.trim());
    const itemId = choice ? Number(choice[1]) : undefined;
    if (
      itemId !== undefined &&
      (!Number.isSafeInteger(itemId) || itemId > 2147483647)
    ) {
      await interaction.editReply(
        appText.botHandlerTheSelectedCatalogItemIsInvalidPleaseChooseAnAutocomplete,
      );
      return;
    }
    const receipt = await api.submit(
      {
        interactionId: interaction.id,
        guildId,
        actorDiscordId: interaction.user.id,
        rawItemText,
        ...(itemId === undefined ? {} : { itemId }),
        collectorName,
        hardcore,
      },
      screenshot,
    );
    saved = receipt;
    diagnostics?.record('receipt', {
      operation: 'submission',
      code: 'RECEIPT_KNOWN',
      correlation: interaction.id,
      receipt: receipt.submissionId,
    });
    await interaction.editReply(submissionSuccessMessage);
  } catch (error) {
    diagnostics?.record(
      'failure',
      saved
        ? {
            operation: 'submission',
            category: 'acknowledgement',
            code: 'ACK_FAILED',
            correlation: interaction.id,
            receipt: saved.submissionId,
          }
        : {
            operation: 'submission',
            ...(error instanceof WorkloadError
              ? { category: 'overload' as const, code: 'OVERLOADED' as const }
              : botFailure(error)),
            correlation: interaction.id,
          },
    );
    await interaction
      .editReply(
        saved
          ? submissionSuccessMessage
          : error instanceof WorkloadError
            ? appText.botHandlerSubmissionBusyWaitSecondsAndTryAgainThisDeliveryWas(
                error.retryAfterSeconds,
                interactionReference(interaction.id),
              )
            : failureMessage(error, interaction.id),
      )
      .catch(() =>
        diagnostics?.record('failure', {
          operation: 'submission',
          category: 'acknowledgement',
          code: 'ACK_FAILED',
          correlation: interaction.id,
          receipt: saved?.submissionId,
        }),
      );
  } finally {
    release?.();
  }
}
export async function handleInteraction(
  interaction: Interaction,
  api: BotApi,
  guildId: string,
  workloads?: BotWorkloads,
  diagnostics?: OperationalDiagnostics,
): Promise<void> {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction, api, guildId, workloads, diagnostics);
  } else if (
    interaction.isChatInputCommand() &&
    interaction.commandName === 'cc-clog' &&
    interaction.options.getSubcommand(false) === 'submit'
  ) {
    await handleSubmission(interaction, api, guildId, workloads, diagnostics);
  }
}
