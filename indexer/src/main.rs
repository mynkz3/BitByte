use std::env;
use std::fs;
use std::path::PathBuf;
use std::process;

use bitbyte_engine::model::CatalogArtifact;
use bitbyte_engine::ranking::RankingEngine;

fn main() {
    if let Err(error) = run() {
        eprintln!("catalog indexer error: {error}");
        process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let (input, output) = parse_args(env::args().skip(1))?;
    let input_text = fs::read_to_string(&input)
        .map_err(|error| format!("could not read {}: {error}", input.display()))?;
    let artifact: CatalogArtifact = serde_json::from_str(&input_text)
        .map_err(|error| format!("invalid catalog JSON: {error}"))?;

    RankingEngine::from_catalog(artifact.clone())
        .map_err(|error| format!("catalog validation failed: {error}"))?;

    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }
    let output_text = serde_json::to_string_pretty(&artifact)
        .map_err(|error| format!("could not serialize catalog: {error}"))?;
    fs::write(&output, output_text)
        .map_err(|error| format!("could not write {}: {error}", output.display()))?;

    println!(
        "indexed {} datasets into {}",
        artifact.records.len(),
        output.display()
    );
    Ok(())
}

fn parse_args<I>(args: I) -> Result<(PathBuf, PathBuf), String>
where
    I: IntoIterator<Item = String>,
{
    let args = args.into_iter().collect::<Vec<_>>();
    let input = argument_value(&args, "--input")?;
    let output = argument_value(&args, "--output")?;
    Ok((PathBuf::from(input), PathBuf::from(output)))
}

fn argument_value(args: &[String], name: &str) -> Result<String, String> {
    let position = args
        .iter()
        .position(|argument| argument == name)
        .ok_or_else(|| format!("missing {name} argument"))?;
    args.get(position + 1)
        .cloned()
        .filter(|value| !value.starts_with("--"))
        .ok_or_else(|| format!("missing value for {name}"))
}

#[cfg(test)]
mod tests {
    use super::parse_args;

    #[test]
    fn parses_input_and_output_arguments() {
        let (input, output) = parse_args([
            "--input".to_owned(),
            "records.json".to_owned(),
            "--output".to_owned(),
            "index.json".to_owned(),
        ])
        .expect("arguments should parse");

        assert_eq!(input.to_string_lossy(), "records.json");
        assert_eq!(output.to_string_lossy(), "index.json");
    }

    #[test]
    fn rejects_missing_arguments() {
        let error = parse_args(["--input".to_owned(), "records.json".to_owned()])
            .expect_err("missing output should fail");

        assert!(error.contains("--output"));
    }
}
