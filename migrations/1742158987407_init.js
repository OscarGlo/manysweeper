const { PgLiteral } = require("node-pg-migrate");
exports.shorthands = {
  created_at: {
    type: "timestamp",
    notNull: true,
    default: new PgLiteral("current_timestamp"),
  },
};

exports.up = (pgm) => {
  pgm.createTable("user", {
    discord_id: {
      type: "varchar",
      primaryKey: true,
      notNull: true,
    },
    created_at: "created_at",
    name: { type: "varchar", notNull: true },
    color: { type: "varchar", notNull: true },
    avatar: { type: "varchar" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user");
};
