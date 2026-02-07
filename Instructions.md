Notes:
- Please keep a dev log of thoughts when planning next steps, any problems you experienced etc.
- Any AI cost associated with completing this code test will be reimbursed up to £15
- It will say you don't have a Langsmith API key at the top - that is fine its not required


Async Instructions:

1 -  Interface with Google and Pinecone and validate data is being returned with the code as-is (Pinecone keys provided)

PINECONE_API_KEY="pcsk_XYDDG_BfN5XLrsSeNaT3YoNdNj436easP6SCXmFtmCzFKy95V68fHWUEsYQhsTb9NGFEe"
PINECONE_INDEX_NAME="pubmed-articles"

2 - Add scope classifier to ensure questions are in scope for a medical chat bot - respond with a hard coded out of scope response if not in scope

3 - Add a query parser to convert human message to a query suitable for vector search

4 - Use PubMed API to pull info on papers - documentation can be found here: https://www.ncbi.nlm.nih.gov/books/NBK25500/#chapter1.Downloading_Document_Summaries

5 - Update the system to use the data to answer the user query using an LLM
