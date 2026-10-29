// Pin the time zone so date math in tests is deterministic on every machine
module.exports = () => {
  process.env.TZ = 'UTC';
};
