#!/usr/bin/env node

const bcrypt = require("bcryptjs");
const {
  listUsers,
  findUserByUsername,
  upsertUser,
  deleteUser,
} = require("../repositories/userRepository");

const SALT_ROUNDS = 12;

const parseArgs = (argv) =>
  argv.reduce((acc, arg) => {
    if (!arg.startsWith("--")) {
      return acc;
    }
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rest.length > 0 ? rest.join("=").trim() : "true";
    if (key) {
      acc[key] = value;
    }
    return acc;
  }, {});

const printHelp = () => {
  console.log(`
User management CLI

Usage:
  node backend/scripts/users.js <command> [options]

Commands:
  list
      Lists all users (id, username, roles, timestamps).

  create --username=<email> --password=<password> [--roles=admin,user]
      Creates a new user. Fails if the username already exists.

  set-password --username=<email> --password=<password>
      Updates the password for an existing user.

  set-roles --username=<email> --roles=role1,role2
      Replaces the role list for an existing user.

  remove --username=<email>
      Permanently deletes the user record.

Examples:
  node backend/scripts/users.js list
  node backend/scripts/users.js create --username=admin@example.com --password=secret --roles=admin
  node backend/scripts/users.js set-password --username=admin@example.com --password=newpass
  node backend/scripts/users.js set-roles --username=admin@example.com --roles=admin,editor
  node backend/scripts/users.js remove --username=admin@example.com
`);
};

const requireUser = (username) => {
  const user = findUserByUsername(username);
  if (!user) {
    throw new Error(`User '${username}' not found.`);
  }
  return user;
};

const parseRoles = (rolesArg) => {
  if (!rolesArg) {
    return [];
  }
  return rolesArg
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
};

const handleList = () => {
  const users = listUsers();
  console.log(JSON.stringify({ users }, null, 2));
};

const handleCreate = (options) => {
  const { username, password } = options;
  if (!username || !password) {
    throw new Error("create command requires --username and --password.");
  }

  const existing = findUserByUsername(username);
  if (existing) {
    throw new Error(`User '${username}' already exists.`);
  }

  const roles = parseRoles(options.roles);
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const user = upsertUser({ username, passwordHash, roles });
  console.log(
    JSON.stringify(
      {
        message: `Created user '${username}'.`,
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
      },
      null,
      2,
    ),
  );
};

const handleSetPassword = (options) => {
  const { username, password } = options;
  if (!username || !password) {
    throw new Error("set-password command requires --username and --password.");
  }

  const existing = requireUser(username);
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const user = upsertUser({
    username,
    passwordHash,
    roles: existing.roles,
  });

  console.log(
    JSON.stringify(
      {
        message: `Updated password for '${username}'.`,
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
      },
      null,
      2,
    ),
  );
};

const handleSetRoles = (options) => {
  const { username, roles: rolesArg } = options;
  if (!username || typeof rolesArg !== "string") {
    throw new Error("set-roles command requires --username and --roles.");
  }
  const existing = requireUser(username);
  const roles = parseRoles(rolesArg);
  const user = upsertUser({
    username,
    passwordHash: existing.passwordHash,
    roles,
  });

  console.log(
    JSON.stringify(
      {
        message: `Updated roles for '${username}'.`,
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
      },
      null,
      2,
    ),
  );
};

const handleRemove = (options) => {
  const { username } = options;
  if (!username) {
    throw new Error("remove command requires --username.");
  }

  requireUser(username);
  deleteUser(username);

  console.log(
    JSON.stringify(
      {
        message: `Removed user '${username}'.`,
      },
      null,
      2,
    ),
  );
};

const main = () => {
  const [, , command, ...rest] = process.argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const options = parseArgs(rest);

  try {
    switch (command) {
      case "list":
        handleList();
        break;
      case "create":
        handleCreate(options);
        break;
      case "set-password":
        handleSetPassword(options);
        break;
      case "set-roles":
        handleSetRoles(options);
        break;
      case "remove":
        handleRemove(options);
        break;
      default:
        throw new Error(`Unknown command '${command}'. Use 'help' to see usage.`);
    }
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          level: "error",
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
};

main();
