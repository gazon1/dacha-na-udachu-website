# ==============================================================================
# ✅ TESTING
# ==============================================================================

[group('test')]
[doc('Run tests with coverage report. using Coverlet (simplified version)')]
test-coverage:
    #!/usr/bin/env bash
    set -e

    echo "Running tests with code coverage..."

    # Run unit tests
    dotnet test WebCrawler.Tests/WebCrawler.Tests.csproj \
    --collect:"XPlat Code Coverage" \
    --results-directory ./TestResults/UnitTests \
    --logger "console;verbosity=normal"

    # Run integration tests (skip if Docker is not available)
    if command -v docker &> /dev/null; then
    echo "Running integration tests with Docker..."
    dotnet test WebCrawler.Integration.Tests/WebCrawler.Integration.Tests.csproj \
        --collect:"XPlat Code Coverage" \
        --results-directory ./TestResults/IntegrationTests \
        --logger "console;verbosity=normal"
    else
    echo "Docker not available, skipping integration tests"
    fi

    echo ""
    echo "Coverage data generated in ./TestResults/"
    echo ""
    echo "To generate HTML reports, run with reportgenerator:"
    echo "  dotnet tool install -g dotnet-reportgenerator-globaltool"
    echo "  reportgenerator -reports:\"./TestResults/**/coverage.cobertura.xml\" -targetdir:\"./TestResults/CoverageReport\" -reporttypes:Html"


[group('test')]
[doc('Run tests with coverage report. Extended. using Coverlet. Generates HTML, Cobertura, and JSON coverage reports')]
test-coverage-full:
    #!/usr/bin/env bash
    set -e

    echo "Running tests with code coverage..."

    # Run unit tests
    dotnet test WebCrawler.Tests/WebCrawler.Tests.csproj \
    --collect:"XPlat Code Coverage" \
    --settings coverlet.runsettings \
    --results-directory ./TestResults/UnitTests \
    --logger "console;verbosity=normal" \
    -- DataCollectionRunSettings.DataCollectors.DataCollector.ArgumentFormat=opencover

    # Run integration tests
    dotnet test WebCrawler.Integration.Tests/WebCrawler.Integration.Tests.csproj \
    --collect:"XPlat Code Coverage" \
    --settings coverlet.runsettings \
    --results-directory ./TestResults/IntegrationTests \
    --logger "console;verbosity=normal" \
    -- DataCollectionRunSettings.DataCollectors.DataCollector.ArgumentFormat=opencover

    # Generate HTML reports using reportgenerator
    # Install reportgenerator if not already installed
    if ! command -v reportgenerator &> /dev/null; then
        echo "Installing reportgenerator..."
        dotnet tool install -g dotnet-reportgenerator-globaltool
    fi

    # Generate HTML report for unit tests
    echo "Generating HTML coverage report for unit tests..."
    reportgenerator \
    -reports:"./TestResults/UnitTests/**/coverage.opencover.xml" \
    -targetdir:"./TestResults/CoverageReport/UnitTests" \
    -reporttypes:"Html;Cobertura;JsonSummary"

    # Generate HTML report for integration tests
    echo "Generating HTML coverage report for integration tests..."
    reportgenerator \
    -reports:"./TestResults/IntegrationTests/**/coverage.opencover.xml" \
    -targetdir:"./TestResults/CoverageReport/IntegrationTests" \
    -reporttypes:"Html;Cobertura;JsonSummary"

    # Generate combined report if both tests have coverage files
    echo "Generating combined coverage report..."
    reportgenerator \
    -reports:"./TestResults/UnitTests/**/coverage.opencover.xml;./TestResults/IntegrationTests/**/coverage.opencover.xml" \
    -targetdir:"./TestResults/CoverageReport/Combined" \
    -reporttypes:"Html;Cobertura;JsonSummary"

    echo ""
    echo "Coverage reports generated in ./TestResults/CoverageReport/"
    echo "Open ./TestResults/CoverageReport/Combined/index.html in your browser to view the report"


[group('test')]
[doc('Run unit tests')]
[working-directory("/workspace/")]
test-unit:
    #!/usr/bin/env bash
    set -e
    dotnet test WebCrawler.Tests