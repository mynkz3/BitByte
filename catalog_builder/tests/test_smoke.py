from bitbyte_catalog import __version__


def test_catalog_package_has_version() -> None:
    assert __version__ == "0.1.0"
