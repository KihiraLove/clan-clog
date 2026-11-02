import * as appText from '@clog/domain';
/** Decode a local icon, stage its upload, then create one item with multiple memberships. */
import { useCallback, useEffect, useState } from 'react';
import { AdminRequestError } from './admin-api.ts';
import {
  validateIconFile,
  validateIconSize,
  validateItem,
  parseGameItemIds,
  type AdminCatalog,
  type AdminClient,
  type CreatedItem,
  type CreateItem,
  type StagedIcon,
} from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';

/** Revoke preview URLs and close decoded bitmaps when replacing files or leaving the form. */
export function IconPicker({
  disabled,
  onValid,
  optional = false,
}: {
  disabled: boolean;
  onValid: (file: File | undefined) => void;
  optional?: boolean;
}) {
  const [file, setFile] = useState<File>(),
    [url, setUrl] = useState<string>(),
    [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false),
    [size, setSize] = useState<string>();
  useEffect(() => {
    let active = true,
      imageUrl: string | undefined;
    setUrl(undefined);
    setError(undefined);
    setSize(undefined);
    onValid(undefined);
    setChecking(Boolean(file));
    if (!file) return;
    void (async () => {
      await validateIconFile(file);
      const bitmap = await createImageBitmap(file);
      try {
        validateIconSize(bitmap.width, bitmap.height);
        if (!active) return;
        imageUrl = URL.createObjectURL(file);
        setUrl(imageUrl);
        setSize(bitmap.width + ' × ' + bitmap.height + ' pixels');
        onValid(file);
      } finally {
        bitmap.close();
      }
    })()
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error && !('code' in failure)
              ? failure.message
              : appText.webItemCreatorTheFileCouldNotBeDecodedAsAPngWebP,
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [file, onValid]);
  return (
    <div className="icon-picker">
      <label>
        {optional
          ? appText.webItemCreatorReplaceItemIcon
          : appText.webItemCreatorItemIconRequired}
        <input
          type="file"
          accept="image/png,image/webp,.png,.webp"
          disabled={disabled}
          onChange={(event) => setFile(event.target.files?.[0])}
        />
      </label>
      <p className="admin-note">{appText.webItemCreatorPngOrWebP}</p>
      {checking && <p role="status">{appText.webItemCreatorCheckingIcon}</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {url && (
        <div className="icon-picker__preview">
          <img src={url} alt={appText.webItemCreatorNewItemIconPreview} />
          <span>{size}</span>
        </div>
      )}
    </div>
  );
}
export function ItemCreator({
  client,
  catalog,
  session,
  onAccessLost,
  refresh,
  pageId,
  onStateChange,
}: {
  client: AdminClient;
  catalog: AdminCatalog;
  session: AdminSession;
  onAccessLost: () => void;
  refresh: (signal: AbortSignal) => Promise<AdminCatalog>;
  pageId: string;
  onStateChange?: (state: { dirty: boolean; busy: boolean }) => void;
}) {
  const [name, setName] = useState(''),
    [gameIds, setGameIds] = useState('');
  const pageIds = [pageId];
  const [file, setFile] = useState<File>(),
    [staged, setStaged] = useState<StagedIcon>(),
    [reset, setReset] = useState(0);
  const [pending, setPending] = useState<{ fields: CreateItem; key: string }>(),
    [created, setCreated] = useState<CreatedItem>();
  const action = useAdminAction(onAccessLost);
  const dirty = !!(name || file || gameIds || pending);
  useEffect(() => {
    onStateChange?.({ dirty, busy: action.busy });
  }, [dirty, action.busy, onStateChange]);
  useAdminDraft(!!(name || file || gameIds || pending), action.busy);
  const iconChanged = useCallback((file: File | undefined) => {
    setFile(file);
    setStaged(undefined);
  }, []);
  const locked = action.busy || Boolean(pending);
  const save = () => {
    void action.execute(async (signal) => {
      // Preserve payload and idempotency key after an uncertain response to avoid duplicates.
      let request = pending;
      if (!request) {
        if (!file)
          throw new Error(
            appText.webItemCreatorChooseAValidItemIconBeforeSaving,
          );
        validateItem(
          {
            name,
            pageIds,
            gameItemIds: parseGameItemIds(gameIds),
            iconAssetId: 'not-uploaded-yet',
          },
          catalog,
        );
        let icon = staged;
        if (!icon || Date.parse(icon.expiresAt) <= Date.now()) {
          icon = await client.upload(file, session.csrfToken, signal);
          if (signal.aborted) return;
          setStaged(icon);
        }
        request = {
          fields: validateItem(
            {
              name,
              pageIds,
              gameItemIds: parseGameItemIds(gameIds),
              iconAssetId: icon.assetId,
            },
            catalog,
          ),
          key: crypto.randomUUID(),
        };
        setPending(request);
      }
      let result: CreatedItem;
      try {
        result = await client.create(
          request.fields,
          request.key,
          session.csrfToken,
          signal,
        );
      } catch (failure) {
        if (
          failure instanceof AdminRequestError &&
          failure.status >= 400 &&
          failure.status < 500 &&
          failure.status !== 408
        ) {
          setPending(undefined);
          if (failure.status === 422) setStaged(undefined);
        }
        throw failure;
      }
      if (signal.aborted) return;
      setCreated(result);
      setPending(undefined);
      setName('');
      setGameIds('');
      setFile(undefined);
      setStaged(undefined);
      setReset((n) => n + 1);
      action.setMessage(
        appText.webItemCreatorItemCreatedEverySelectedPageStartsUncollected(
          result.item.id,
        ),
      );
      try {
        await refresh(signal);
      } catch (failure) {
        if (
          failure instanceof AdminRequestError &&
          [401, 403].includes(failure.status)
        )
          throw failure;
        action.setError(
          appText.webItemCreatorTheItemWasCreatedButTheCatalogCouldNotBe,
        );
      }
    });
  };
  return (
    <section
      className="admin-panel item-creator"
      aria-labelledby="add-item-title"
    >
      <h2 id="add-item-title">{appText.webItemCreatorAddNewItem}</h2>
      {action.error && (
        <p role="alert" className="admin-error">
          {action.error}
        </p>
      )}
      {action.message && (
        <p role="status" className="admin-success">
          {action.message}
        </p>
      )}
      {created && (
        <div className="admin-created">
          <img src={created.item.iconPath} alt="" />
          <div>
            <strong>
              {appText.webItemCreatorItemIdentity(
                created.item.name,
                created.item.id,
              )}
            </strong>
            <p>
              {created.pageIds
                .map(
                  (id) =>
                    catalog.pages.find((page) => page.id === id)?.name ?? id,
                )
                .join(', ')}
            </p>
            <span className="admin-badge">
              {appText.webItemCreatorManualItemUncollected}
            </span>
          </div>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset className="admin-fieldset" disabled={locked}>
          <IconPicker key={reset} disabled={locked} onValid={iconChanged} />
          <label>
            {appText.webItemCreatorItemName}
            <input
              required
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            {appText.webItemCreatorInGameItemIdRequired}
            <input
              required
              inputMode="numeric"
              value={gameIds}
              onChange={(event) => setGameIds(event.target.value)}
            />
          </label>
        </fieldset>
        {pending && !action.busy && (
          <p className="admin-note">
            {
              appText.webItemCreatorThePreviousSaveHasAnUncertainResultRetryTheSame
            }
          </p>
        )}
        <button className="site-button" type="submit" disabled={action.busy}>
          {action.busy
            ? appText.webItemCreatorSavingItem
            : pending
              ? appText.webItemCreatorRetryItemSave
              : appText.webItemCreatorCreateItem}
        </button>
      </form>
    </section>
  );
}
