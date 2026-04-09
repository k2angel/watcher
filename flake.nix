{
  description = "A basic flake with a shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.systems.url = "github:nix-systems/default";
  inputs.flake-utils = {
    url = "github:numtide/flake-utils";
    inputs.systems.follows = "systems";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_25;
        npmRoot = ./.;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            pkgs.importNpmLock.hooks.linkNodeModulesHook
          ];
          npmDeps = pkgs.importNpmLock.buildNodeModules {
            inherit nodejs npmRoot;
          };
        };
      }
    );
}
