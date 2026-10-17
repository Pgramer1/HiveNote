import httpx


class DownloadError(Exception):
    pass


def download(url: str, max_bytes: int) -> bytes:
    """Downloads a resource file (public Cloudinary URL), refusing anything over `max_bytes`."""
    try:
        with httpx.stream("GET", url, timeout=60, follow_redirects=True) as res:
            if res.status_code != 200:
                raise DownloadError(f"Download failed with HTTP {res.status_code}")
            data = bytearray()
            for part in res.iter_bytes():
                data.extend(part)
                if len(data) > max_bytes:
                    raise DownloadError(f"File is larger than {max_bytes // (1024 * 1024)} MB")
            return bytes(data)
    except httpx.HTTPError as exc:
        raise DownloadError(f"Download failed: {exc}") from exc
