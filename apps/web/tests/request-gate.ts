/** Controllable request completion: no sleeps or dependence on machine speed. */
export function requestGate() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    entered,
    release,
    hold: () => {
      enter();
      return released;
    },
  };
}
