module.exports = {
  apps: [
    {
      name: "seo-manager",
      script: "node_modules/next/dist/bin/next",
      args: "dev",
      cwd: "./",
      watch: false,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
