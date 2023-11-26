---
layout: post
title:  "Thoughts on metagenomic profiling. Part 1 - as a tool developer"
date:   2022-11-30 
categories: jekyll update
---

### Background - I spent a few months developing a metagenomic profiler

I recently spent a few months developing a new metagenomic profiler (shotgun, not 16S) called [sylph](https://github.com/bluenote-1577/sylph). I wanted to write down a few opinions on some difficulties during the development process. 

The post is a combination of 

* A justification for why I designed my software as is
* Opinions for future profiler development choices
* Pre-rebuttal to reviewers :) (just kidding, somewhat)

To be honest, I'm not sure who my target audience is for this blog post. Tool developers may find it interesting. I think practitioners may also find the information useful for illuminating some weirdnessnes in profiler usage. Hopefully, you'll at least learn something about taxonomic profiling. 

__Note: I am just some guy who developed a profiler and has some opinions. I’m not a microbiologist nor a definitive source. I’m open to feedback and opinions, especially if I say something wrong about your tool.__

### Problem 1 - NCBI resource usability for metagenomics

Here is my understanding of some fundamental aspects of (prokaryotic) databases.   

__RefSeq__:  a collection of curated genomes from the NCBI. RefSeq encompasses all kingdoms of life and is comprehensive. 

__NCBI Taxonomy__: an official taxonomy from the NCBI. Provides nomenclature (names of taxa) and their hierarchical relationships. 

__Genome Taxonomy Database (GTDB)__: a database + taxonomy for prokaryotes, distinct from RefSeq/NCBI taxonomy. 

The default database offered by many profilers, such as Kraken, uses the NCBI taxonomy + reference genomes from RefSeq. Other methods like mOTUs or MetaPhlAn use the NCBI taxonomy as well, but not just RefSeq genomes. The most popular standardized benchmark, **the CAMI benchmark**, uses RefSeq/NCBI taxonomy. 

I first want to recognize the amazing work done by the creators of the RefSeq and the NCBI taxonomies. They are invaluable resources. However, I have a few grievances _from a purely metagenomic profiling perspective_. 

# Lack of RefSeq database standardization across tools

There is no actual "the RefSeq profiling database". There are options: are genomes  _complete_ or _scaffold-level_? Are prokaryotic genomes _representative or reference_? Should viral/eukaryotes be included? 

The lack of standardization is hampered by RefSeq having a continuous release structure as well as a discrete release structure. In many situations, the continuous release is used. For example, the CAMI datasets use a January 8, 2019 RefSeq snapshot. This is a problem for benchmarking across different versions (discussed later). 

In summary, there are also many different options to be included in a RefSeq database, making database standardization difficult. 

# Parsing NCBI taxonomy is rife with pitfalls

This is a major grievance I have. The taxonomy that the NCBI provides is _difficult to parse_. Here are the basic steps:

1. There is a serialized tree data structure with internal node IDs called "taxid"s called nodes.dmp. You have to parse this tree data structure. 
2. You have to get a mapping from a sequence accession to a taxid called accession2taxid. [But there are many versions](https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/accession2taxid/). This then involves parsing a > 1GB gzipped line-delimited file.
3. You get the name for the taxid from a file called names.dmp.

The documentation for parsing taxonomy files, getting accession2taxid, etc are stored mostly in READMEs in an FTP server; I found it intimidating. Ultimately, the NCBI taxonomy is meant for all NCBI sequences, _not just RefSeq_. This makes it comprehensive, but you end up mostly parsing non-useful information (if you use RefSeq; there are other options too such as NCBI nt). 

**Why should a user care?** Have you ever tried to add new taxonomic nodes to a Kraken database? [Not so forgiving]( https://github.com/DerrickWood/kraken2/issues/436). This isn’t the Kraken developers’ fault, it’s because they had to make it concordant with the NCBI taxonomy, which was never really meant to be used for creating profiling databases. 

# Example solution and taxonomy format

**My opinion:**

1. Let’s use a simpler taxonomy format for profiling tools. 
2. Let’s couple taxonomic information for a database to the genomes in the database. 

Here is a simple format: store a correspondence between each genome file/sequence and a string in a two-column TSV file:

Genome_file	Tax_string

GCA_945889495.1.fasta	d__Bacteria;p__Desulfobacterota_B;...;g__DP-20;s__DP-20 sp945889495

GCA_934500585.1.fasta	d__Bacteria;p__Bacillota_A;...;g__RQCD01;s__RQCD01 sp008668455

That’s it -- just one file. This would allow you to reconstruct a taxonomic tree, giving you _the exact same information_ as the NCBI files. 

This would allow your favourite MAG classification tool (GTDB-TK, for example) to be integrated into a taxonomic profiler database. To add a new species, you just add a genome and its new taxonomy string to the file. This is roughly what sylph does for the GTDB database. 

### Problem 2 - Benchmarking against other tools and taxonomies is hard

A large part of developing a profiler comes down to benchmarking (anywhere from 20-50% of the time). I feel that benchmarking profilers is extremely difficult due to _database choice_. This will be a constant theme for the following points. 

# Making synthetic datasets is hard (and no one trusts them anymore)

I've seen numerous studies that have constructed synthetic metagenomes and claimed results that don't seem to match real metagenomes. Some common pitfalls:

1. uniform abundance distributions 
2. genomes in the metagenome are _the same_ as genomes in the chosen databases
3. all genomes in the metagenome have a similar genome in the database. 

Some benchmark studies claim near-perfect accuracy for many tools, whereas other benchmarks claim most tools perform poorly. This is due to many factors: parameters, database choice, construction of metagenome, etc. 

For me, this has created distrust of custom synthetic benchmarks. I find myself glazing over custom benchmarks and just looking at CAMI results... but this is not a good thing for the field. While standardized datasets are great, they must lack _some_ aspect of a real metagenome. Also, methods will inevitably overfit to them.

# Database choice is a massive headache when benchmarking

When you are comparing tools, there are two options.

1.  __(A)__ You choose a default database for each tool and compare across databases. 
2. __(B)__ You use _the same_ database for every method. 


Option **(B)** is reasonable and done by many manuscripts. It seems fair enough.

Option **(A)** possibly represents a more accurate representation of actual usage -- I bet folks out there use Kraken2's RefSeq default database and MetaPhlAn4's default marker database, which are completely different. 

But **(A)** is an issue due to the following:

* One method could use a more comprehensive database or simply choose genomes that are more similar to the metagenome.  Which profiler is really better?
*  __Taxa names can change between different databases/taxonomy versions.__ Comparisons become impossible here. 

Marker gene methods (mOTUs, MetaPhlAn) use the NCBI taxonomy, but they use a fixed version since their database is not customizable. mOTUs3 [seems to use the 8 January 2019](https://github.com/motu-tool/mOTUs/issues/85) for concordance with CAMI, probably, and I don’t know about MetaPhlAn4. This makes **(B)** impossible unless large standardized challenges invite the method authors to submit a profile, like CAMI. 

What’s a good solution? To be honest, I don’t know. Some thoughts:

* Marker gene methods are extremely performant. Reviewers will complain if you don’t benchmark, but benchmarking against them means using their fixed taxonomies. 
* Many people are using GTDB now (see [here](https://www.biorxiv.org/content/10.1101/712166v1), for example). I won’t get into NCBI vs GTDB here. 
* I tried to map MetaPhlAn4 taxonomic profiles to the GTDB, but NCBI and GTDB are inherently not 1-to-1, so issues arose and ended up penalizing MetaPhlAn4 in comparisons. 
* Should we just use Jan 8, 2019 RefSeq + CAMI for all benchmarks? Jan 8, 2019 is almost 5 years old at this point. 

### Problem 3 -  Standardizing taxonomic profiling outputs

Profilers output their profiles in whatever way they want, and it’s up to the user to standardize them. This is annoying for users, but also for developers. I’ll discuss why I think this situation ended up happening. 

# Methods do different things

1. __Taxonomic profiling__ is the quantification of taxa for a metagenomic sample. Taxonomic profiling, of course, requires a taxonomy. 

2. I will define __genome profiling__ as the quantification of the genomes in a database. Note that genome profiling does not require a taxonomy, but genome profiles can be turned into a taxonomic profile by incorporating a taxonomy. 

3. Some methods are __sequence classifiers__. They classify each sequence (i.e. read) against a database and then use this for either taxonomic or genome quantification. The term **taxonomic binner** is used; I dislike the term because it gets confused with contig binning. 

Sequence classifiers, genome profilers, and taxonomic profilers are not exclusive; most methods do multiple things. As such, they will output different things. 

For example, Kraken does all (1) and (3). Sylph does (2) and can incorporate taxonomic information downstream for (1). MetaPhlAn4 does (1), but algorithmically it’s more like (2) -- it [aligns reads to a species-level database of marker genes](https://forum.biobakery.org/t/origin-clade-specific-marker-genes/3806) (the “genomes”) and then sums up abundances.

# We need a standardized taxonomic profiling output 

Standardizing sequence classifiers and genome profiling is out of scope, but we can at least attempt to standardize __taxonomic profiling__ outputs. The [CAMI format for taxonomic profiling](https://github.com/CAMI-challenge/contest_information/blob/master/file_formats/CAMI_TP_specification.mkd) is a possible choice, but it is not the standard for Kraken or MetaPhlAn.  MetaPhlAn has its own output, which is similar. 

I think these formats are reasonable, but here are some rudimentary thoughts.

* I don’t like taxids included in a format specification. This requires a relationship to the NCBI taxonomy. They could be included as additional tags. 
* Existing output formats do not allow for customization. The [SAM format](https://samtools.github.io/hts-specs/SAMv1.pdf) allows for optional tags for each record to record additional information, for example. 
* We should really be attaching some sort of confidence score to each classification. Think about how useful MAPQs are in read mapping. 
* We should record the exact taxonomies (i.e. versions) used. Taxonomic profiles and taxonomy are intertwined. 

### Conclusion

Developing profilers is hard. The differences between methods on (1) database, (2) taxonomy, and (3) outputs make development and benchmarking difficult. I have a newfound respect for the people behind large standardized benchmarks, especially the folks behind CAMI for tackling these challenges.

My ideal future as a tool developer?

1. Let’s have a collection of standardized and versioned databases, each with (1) a set of genomes and (2) an associated taxonomy file that is easy to parse.
2. We can extend each database by simply dropping in a fasta file and adding a new line in the taxonomy file. 
3. Let’s allow each tool to use one of these standardized databases and output concordant taxonomic profiles, making benchmarking and cross-profile comparison easy. This allows practitioners to try different databases easily too. 

**Acknowledgements:** Thanks to the people in my [bluesky complaint thread](https://bsky.app/profile/jimshaw.bsky.social/post/3ka5ftbdgbt2f) who gave their thoughts on profilers. 

[jekyll-docs]: https://jekyllrb.com/docs/home
[jekyll-gh]:   https://github.com/jekyll/jekyll
[jekyll-talk]: https://talk.jekyllrb.com/

