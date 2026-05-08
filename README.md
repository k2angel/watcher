# watcher
discord media downloader and profile monitor

## setup
```
mv config.example.json config.json
vim config.json
```

## usage
```
docker pull ghcr.io/k2angel/watcher:latest
docker run \
    --userns=keep-id \
    -v ./config.json:/usr/src/app/config.json:ro \
    -v ./attachments:/usr/src/app/attachments:rw \
    ghcr.io/k2angel/watcher:latest
```

