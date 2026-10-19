use std::collections::HashSet;

const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "of", "on", "or",
    "that", "the", "this", "to", "using", "with",
];

pub fn canonical(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_alphanumeric() {
                character
            } else {
                '_'
            }
        })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_")
}

pub fn tokenize(input: &str) -> Vec<String> {
    let stop_words: HashSet<&str> = STOP_WORDS.iter().copied().collect();
    let mut tokens = Vec::new();
    let mut current = String::new();

    for character in input.chars() {
        if character.is_alphanumeric() {
            current.extend(character.to_lowercase());
        } else if !current.is_empty() {
            if !stop_words.contains(current.as_str()) {
                tokens.push(std::mem::take(&mut current));
            } else {
                current.clear();
            }
        }
    }

    if !current.is_empty() && !stop_words.contains(current.as_str()) {
        tokens.push(current);
    }

    tokens
}

#[cfg(test)]
mod tests {
    use super::{canonical, tokenize};

    #[test]
    fn canonicalizes_taxonomy_values() {
        assert_eq!(canonical("Time-Series"), "time_series");
        assert_eq!(canonical(" image "), "image");
    }

    #[test]
    fn tokenization_is_lowercase_and_ignores_common_words() {
        assert_eq!(
            tokenize("Classify the retinal images"),
            ["classify", "retinal", "images"]
        );
    }
}
