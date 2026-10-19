from bitbyte_catalog.normalize import canonicalize_term, canonicalize_terms, license_category


def test_canonicalize_term_uses_taxonomy_aliases() -> None:
    assert canonicalize_term("image-classification", "tasks") == "classification"
    assert canonicalize_term("CSV", "modalities") == "tabular"


def test_canonicalize_terms_removes_duplicates_preserving_order() -> None:
    assert canonicalize_terms(["image", "visual", "image"], "modalities") == ["image"]


def test_license_category_handles_common_public_licenses() -> None:
    assert license_category("MIT") == "permissive"
    assert license_category("CC BY 4.0") == "permissive"
    assert license_category(None) == "unknown"
