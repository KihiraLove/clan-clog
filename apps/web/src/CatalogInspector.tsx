import * as appText from '@clog/domain';
/** Contextual catalog forms, with explicit confirmation for removal and durable creation retries. */
import { useCallback, useEffect, useState } from 'react';
import { catalogSections } from './model.ts';
import { parseGameItemIds, type AdminPage } from './admin-model.ts';
import { AdminRequestError } from './admin-api.ts';
import { ItemCreator, IconPicker } from './ItemCreator.tsx';
import type { CatalogEditorProps } from './CatalogLogEditor.tsx';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
export type CatalogEditor =
  | { kind: 'section-add' }
  | {
      kind:
        | 'section-edit'
        | 'page-add'
        | 'page-edit'
        | 'item-add'
        | 'item-new'
        | 'item-existing';
      id: string;
    }
  | { kind: 'item-edit'; id: number };
interface Props extends CatalogEditorProps {
  order:
    | { previous: boolean; next: boolean; move: (offset: number) => void }
    | undefined;
  editor: CatalogEditor;
  onStateChange: (state: { dirty: boolean; busy: boolean }) => void;
  onOpen: (editor: CatalogEditor) => void;
  onDone: () => void;
  onCreatedPage: (page: AdminPage) => void;
  onCreatedSection: (id: string) => void;
}
export function CatalogInspector(props: Props) {
  const editor = props.editor;
  if (
    (editor.kind === 'item-new' || editor.kind === 'item-add') &&
    !props.catalog.pages.some((page) => page.id === editor.id)
  )
    return (
      <p role="alert">
        {appText.webCatalogInspectorThisPageIsNoLongerInTheCatalogCloseThe}
      </p>
    );
  if (props.editor.kind === 'item-new')
    return <ItemCreator {...props} pageId={props.editor.id} />;
  if (editor.kind === 'item-add')
    return (
      <div className="catalog-add-menu">
        <h2>{appText.webCatalogInspectorAddItem}</h2>
        <button
          type="button"
          className="site-button"
          onClick={() => props.onOpen({ kind: 'item-new', id: editor.id })}
        >
          {appText.webCatalogInspectorAddNewItem}
        </button>
        <button
          type="button"
          className="site-button"
          onClick={() => props.onOpen({ kind: 'item-existing', id: editor.id })}
        >
          {appText.webCatalogInspectorAddExistingItem}
        </button>
      </div>
    );
  return <CatalogForm {...props} />;
}
function CatalogForm({
  editor,
  catalog,
  client,
  session,
  refresh,
  onAccessLost,
  onStateChange,
  onDone,
  onCreatedPage,
  onCreatedSection,
  order,
}: Props) {
  const section =
    editor.kind === 'section-edit'
      ? catalogSections(catalog).find((s) => s.id === editor.id)
      : undefined;
  const page =
    editor.kind === 'page-edit'
      ? catalog.pages.find((p) => p.id === editor.id)
      : undefined;
  const item =
    editor.kind === 'item-edit'
      ? catalog.items.find((i) => i.id === editor.id)
      : undefined;
  const [name, setName] = useState(
      section?.name ?? page?.name ?? item?.name ?? '',
    ),
    [gameIds, setGameIds] = useState(item?.gameItemIds?.join(', ') ?? ''),
    [search, setSearch] = useState('');
  const [file, setFile] = useState<File>(),
    [pending, setPending] = useState<{
      key: string;
      name: string;
      revision: string;
    }>();
  const action = useAdminAction(onAccessLost),
    locked = action.busy || !!pending;
  const dirty =
    !!pending ||
    !!file ||
    name !== (section?.name ?? page?.name ?? item?.name ?? '') ||
    (!!item && gameIds !== (item.gameItemIds?.join(', ') ?? ''));
  useAdminDraft(dirty, action.busy);
  useEffect(() => {
    onStateChange({ dirty, busy: action.busy });
  }, [dirty, action.busy, onStateChange]);
  const iconChanged = useCallback(
    (value: File | undefined) => setFile(value),
    [],
  );
  const conflict = async (signal: AbortSignal) => {
    await refresh(signal);
  };
  const write = (
    operation: (signal: AbortSignal) => Promise<unknown>,
    message: string,
    done = false,
  ) => {
    void action.execute(async (signal) => {
      await operation(signal);
      await refresh(signal);
      if (signal.aborted) return;
      action.setMessage(message);
      if (done) onDone();
    }, conflict);
  };
  const submit = () => {
    void action.execute(async (signal) => {
      const clean = name.trim();
      if (!clean) throw new Error(appText.webCatalogInspectorEnterAName);
      if (editor.kind === 'section-add' || editor.kind === 'page-add') {
        const request = pending ?? {
          key: crypto.randomUUID(),
          name: clean,
          revision: catalog.revision,
        };
        setPending(request);
        try {
          if (editor.kind === 'section-add') {
            const created = await client.createSection(
              request.name,
              request.key,
              request.revision,
              session.csrfToken,
              signal,
            );
            onCreatedSection(created.id);
          } else {
            const created = await client.createPage(
              { name: request.name, category: editor.id, itemIds: [] },
              request.key,
              request.revision,
              session.csrfToken,
              signal,
            );
            onCreatedPage(created);
          }
        } catch (failure) {
          if (
            failure instanceof AdminRequestError &&
            [400, 409, 422].includes(failure.status)
          )
            setPending(undefined);
          throw failure;
        }
        setPending(undefined);
        setName('');
      } else if (section)
        await client.editSection(
          section.id,
          clean,
          catalog.revision,
          session.csrfToken,
          signal,
        );
      else if (page)
        await client.renamePage(
          page.id,
          clean,
          catalog.revision,
          session.csrfToken,
          signal,
        );
      else if (item) {
        const ids = parseGameItemIds(gameIds);
        const icon = file
          ? await client.upload(file, session.csrfToken, signal)
          : undefined;
        await client.editItem(
          item.id,
          {
            name: clean,
            gameItemIds: ids,
            ...(icon ? { iconAssetId: icon.assetId } : {}),
          },
          catalog.revision,
          session.csrfToken,
          signal,
        );
      }
      await refresh(signal);
      if (!signal.aborted) {
        if (editor.kind !== 'section-add' && editor.kind !== 'page-add')
          setName(clean);
        if (item)
          setGameIds(
            parseGameItemIds(gameIds)
              .sort((a, b) => a - b)
              .join(', '),
          );
        setFile(undefined);
        action.setMessage(appText.webCatalogInspectorChangesSaved);
      }
    }, conflict);
  };
  const title =
    editor.kind === 'section-add'
      ? appText.webCatalogInspectorAddSection
      : editor.kind === 'section-edit'
        ? appText.webCatalogInspectorEditSection
        : editor.kind === 'page-add'
          ? appText.webCatalogInspectorAddPage
          : editor.kind === 'page-edit'
            ? appText.webCatalogInspectorEditPage
            : editor.kind === 'item-existing'
              ? appText.webCatalogInspectorAddExistingItem
              : appText.webCatalogInspectorEditItem;
  const existingPage =
    editor.kind === 'item-existing'
      ? catalog.pages.find((p) => p.id === editor.id)
      : undefined;
  if (
    (editor.kind === 'section-edit' && !section) ||
    (editor.kind === 'page-edit' && !page) ||
    (editor.kind === 'item-edit' && !item) ||
    (editor.kind === 'item-existing' && !existingPage) ||
    (editor.kind === 'page-add' &&
      !catalogSections(catalog).some((section) => section.id === editor.id))
  )
    return (
      <p role="alert">
        {
          appText.webCatalogInspectorThisCatalogEntryIsNoLongerAvailableCloseTheEditor
        }
      </p>
    );
  const query = search.trim().toLowerCase();
  const choices = catalog.items.filter(
    (i) =>
      i.name.toLowerCase().includes(query) ||
      String(i.id) === query ||
      i.gameItemIds?.some((id) => String(id) === query),
  );
  return (
    <div className="catalog-form">
      <h2>{title}</h2>
      {order && editor.kind !== 'section-edit' && (
        <div className="catalog-position-controls">
          <button
            type="button"
            className="site-button"
            disabled={locked || !order.previous}
            onClick={() => order.move(-1)}
          >
            {appText.webCatalogInspectorMoveEarlier}
          </button>
          <button
            type="button"
            className="site-button"
            disabled={locked || !order.next}
            onClick={() => order.move(1)}
          >
            {appText.webCatalogInspectorMoveLater}
          </button>
        </div>
      )}
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
      {editor.kind === 'item-existing' ? (
        <div className="catalog-picker">
          <label>
            <input
              type="search"
              aria-label={appText.webCatalogInspectorSearchItems}
              placeholder={appText.webCatalogInspectorSearchByNameOrId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="catalog-choice-list catalog-existing-list">
            {choices.slice(0, 100).map((entry) => {
              const attached = existingPage?.itemIds.includes(entry.id);
              return (
                <button
                  className="catalog-existing-item"
                  type="button"
                  key={entry.id}
                  disabled={action.busy || attached || !existingPage}
                  aria-label={appText.webCatalogInspectorAddToPage(entry.name)}
                  onClick={() =>
                    write(
                      (signal) =>
                        client.attachItem(
                          existingPage!.id,
                          entry.id,
                          catalog.revision,
                          session.csrfToken,
                          signal,
                        ),
                      appText.webCatalogInspectorAdded(entry.name),
                    )
                  }
                >
                  <img src={entry.iconPath} alt="" />
                  <span>
                    {entry.name}
                    <small>
                      {attached
                        ? appText.webCatalogInspectorAlreadyOnThisPage
                        : catalog.pages.some((p) =>
                              p.itemIds.includes(entry.id),
                            )
                          ? appText.webCatalogInspectorOnOtherPages
                          : appText.webCatalogInspectorPageless}
                    </small>
                  </span>
                </button>
              );
            })}
            {!choices.length && (
              <p>{appText.webCatalogInspectorNoMatchingItems}</p>
            )}
          </div>
          {choices.length > 100 && (
            <p className="admin-note">
              {appText.webCatalogInspectorShowingTheFirst100Matches}
            </p>
          )}
        </div>
      ) : (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <fieldset className="admin-fieldset" disabled={locked}>
              {item && (
                <>
                  <img
                    className="catalog-current-icon"
                    src={item.iconPath}
                    alt={item.name}
                  />
                  <IconPicker
                    optional
                    disabled={locked}
                    onValid={iconChanged}
                  />
                </>
              )}
              <label>
                {item
                  ? appText.webCatalogInspectorItemName
                  : editor.kind.startsWith('section')
                    ? appText.webCatalogInspectorSectionName
                    : appText.webCatalogInspectorPageName}
                <input
                  required
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {item && (
                <label>
                  {appText.webCatalogInspectorInGameItemIds}
                  <input
                    required
                    value={gameIds}
                    onChange={(event) => setGameIds(event.target.value)}
                    placeholder={
                      appText.webCatalogInspectorIdsSeparatedByCommas
                    }
                  />
                </label>
              )}
            </fieldset>
            <button
              type="submit"
              className="site-button"
              disabled={action.busy}
            >
              {pending
                ? appText.webCatalogInspectorRetryCreation
                : editor.kind.endsWith('add')
                  ? appText.webCatalogInspectorCreateEntry(
                      editor.kind === 'section-add',
                    )
                  : appText.webCatalogInspectorSaveChanges}
            </button>
            {pending && !action.busy && (
              <button
                type="button"
                className="site-button"
                onClick={() => setPending(undefined)}
              >
                {appText.webCatalogInspectorDiscardCreationRequest}
              </button>
            )}
          </form>
          {section && (
            <>
              <button
                type="button"
                className="site-button site-button--danger catalog-delete"
                disabled={
                  locked || catalog.pages.some((p) => p.category === section.id)
                }
                onClick={() => {
                  if (
                    window.confirm(
                      appText.webCatalogInspectorDeleteSection(section.name),
                    )
                  )
                    write(
                      (signal) =>
                        client.editSection(
                          section.id,
                          null,
                          catalog.revision,
                          session.csrfToken,
                          signal,
                        ),
                      appText.webCatalogInspectorSectionDeleted,
                      true,
                    );
                }}
              >
                {appText.webCatalogInspectorDeleteSection2}
              </button>
              {catalog.pages.some((p) => p.category === section.id) && (
                <p className="admin-note">
                  {
                    appText.webCatalogInspectorOnlySectionsWithNoPagesCanBeDeleted
                  }
                </p>
              )}
            </>
          )}
          {page && (
            <button
              type="button"
              className="site-button site-button--danger catalog-delete"
              disabled={locked}
              onClick={() => {
                if (
                  window.confirm(
                    appText.webCatalogInspectorDeleteFromBothCollectionLogsItemsRemainOnOtherPages(
                      page.name,
                    ),
                  )
                )
                  write(
                    (signal) =>
                      client.removePage(
                        page.id,
                        catalog.revision,
                        page.version,
                        session.csrfToken,
                        signal,
                      ),
                    appText.webCatalogInspectorPageDeleted,
                    true,
                  );
              }}
            >
              {appText.webCatalogInspectorDeletePage}
            </button>
          )}
          {item && (
            <>
              <h3>{appText.webCatalogInspectorPagesContainingThisItem}</h3>
              <ul className="catalog-memberships">
                {catalog.pages
                  .filter((p) => p.itemIds.includes(item.id))
                  .map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.name}</span>
                      <button
                        type="button"
                        className="site-button"
                        disabled={locked}
                        aria-label={appText.webCatalogInspectorRemoveFrom(
                          item.name,
                          entry.name,
                        )}
                        onClick={() =>
                          write(
                            (signal) =>
                              client.removePageItem(
                                entry.id,
                                item.id,
                                catalog.revision,
                                entry.version,
                                session.csrfToken,
                                signal,
                              ),
                            appText.webCatalogInspectorRemovedFrom(entry.name),
                          )
                        }
                      >
                        {appText.webCatalogInspectorRemove}
                      </button>
                    </li>
                  ))}
              </ul>
              {!catalog.pages.some((p) => p.itemIds.includes(item.id)) && (
                <p className="admin-note">
                  {appText.webCatalogInspectorThisItemIsPageless}
                </p>
              )}
              <button
                type="button"
                className="site-button site-button--danger catalog-delete"
                disabled={locked}
                onClick={() => {
                  if (
                    window.confirm(
                      appText.webCatalogInspectorDeleteFromTheCatalogAndAllItsPagesCollectionAnd(
                        item.name,
                      ),
                    )
                  )
                    write(
                      (signal) =>
                        client.deleteItem(
                          item.id,
                          catalog.revision,
                          session.csrfToken,
                          signal,
                        ),
                      appText.webCatalogInspectorItemDeleted,
                      true,
                    );
                }}
              >
                {appText.webCatalogInspectorDeleteItem}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
