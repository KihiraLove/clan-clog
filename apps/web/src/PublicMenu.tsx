import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import * as appText from '@clog/domain';
import type { SiteNavigation } from './use-route-navigation.ts';
import PublicNameChanges from './PublicNameChanges.tsx';

export default function PublicMenu({
  navigate,
  onHelp,
}: {
  navigate: SiteNavigation['navigate'];
  onHelp: () => void;
}) {
  const [open, setOpen] = useState(false),
    [nameTrigger, setNameTrigger] = useState<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null),
    id = useId();
  const closeForDialog = () => {
    button.current?.focus({ preventScroll: true });
    setOpen(false);
  };
  useLayoutEffect(() => {
    const controls = root.current!.parentElement!,
      header = controls.closest('header')!;
    const measure = () => {
      const game = document.querySelector('.public-log-layout .game-window'),
        viewport = document.querySelector('.public-log-layout .log-viewport');
      const right =
        game && viewport
          ? Math.min(
              game.getBoundingClientRect().right,
              viewport.getBoundingClientRect().right,
            )
          : header.getBoundingClientRect().right;
      controls.style.setProperty(
        '--public-menu-inset',
        Math.max(0, header.getBoundingClientRect().right - right) + 'px',
      );
    };
    const resize = new ResizeObserver(measure);
    resize.observe(header);
    const main = document.querySelector('main')!;
    resize.observe(main);
    const mutation = new MutationObserver(measure);
    mutation.observe(main, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    measure();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      controls.style.removeProperty('--public-menu-inset');
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      button.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div
      className="site-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        className="site-button site-header-link"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {appText.siteMenuTitle}
      </button>
      <div
        id={id}
        className="site-menu-options"
        role="group"
        aria-label={appText.siteMenuOptions}
        hidden={!open}
      >
        <a
          href="/admin"
          onClick={(event) => {
            setOpen(false);
            navigate(event);
          }}
        >
          {appText.webSiteAppAdminPanel}
        </a>
        <button
          type="button"
          className="submission-help-button"
          onClick={() => {
            closeForDialog();
            onHelp();
          }}
        >
          {appText.webSiteAppHowToSubmit}
        </button>
        <div ref={setNameTrigger} />
      </div>
      <PublicNameChanges
        triggerContainer={nameTrigger}
        menuButton={button}
        onOpen={closeForDialog}
      />
    </div>
  );
}
