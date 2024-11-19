---
layout: post
title:  "Developing sylph - a look into bioinformatics tool development"
date:   2024-11-18 
categories: jekyll update
---

In this blog post, I will talk about the process of developing [sylph](https://github.com/bluenote-1577/sylph), a bioinformatics tool we (me and my advisor, [William](https://yunwilliamyu.net/content/)) developed. Sylph is now published in [Nature Biotechnology](https://www.nature.com/articles/s41587-024-02412-y).

I've always found the inner workings of research interesting. This is my contribution. My goal is to demystify tool development in bioinformatics a bit. 

#### Prelude: what is sylph?

Sylph is a new method/software that detects what organisms are present in a [metagenomic DNA sequencing](https://www.nature.com/articles/nbt.3935) sample of a microbiome. This is sometimes called taxonomic or metagenomic *profiling*. A metagenomic sequencing produces small DNA fragments of the genomes within a microbiome (e.g. in your gut). 

This post won't be about the sylph algorithm, but about its development process. I'll assume some familiarity with computational metagenomics going forward, but it's not strictly necessary. 

#### Part 1 - Initial motivation: let's write a faster Mash (late 2022)
-----------

The first paper I ever read in the field of bioinformatics was the [Mash](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0997-x) paper by Ondov et al. back in 2017 (during an undergraduate internship with [Niranjan](https://www.a-star.edu.sg/gis/our-people/faculty-staff/members/niranjan-nagarajan) in Singapore). 

If you're unfamiliar with Mash, it's simply a method for calculating the similarity between two genomes. It does so by analyzing _sketches_, or small subsets, of k-mers. See [this related blog post](https://genomeinformatics.github.io/mash-screen/) for more background. [Sourmash](https://github.com/sourmash-bio/sourmash) is a related tool; I recall meeting with [Titus Brown](http://ivory.idyll.org/lab/) in 2022 and learned quite a bit about sourmash from him. 

The Mash algorithm is simple but powerful. It has tremendously influenced how I feel bioinformatics tools should be: __fast, easy to use, and accurate enough for generating biological hypotheses__. 

**Sylph started from a simple curiosity:** when writing [a genome-to-genome calculation tool](https://www.nature.com/articles/s41592-023-02018-3) in 2022, I noticed that I could create k-mer sketches faster than Mash. This was done by adapting the k-mer processing routines from [minimap2](https://github.com/lh3/minimap2) and learning how to use SIMD instructions to speed stuff up. I thought it would be fun to write a stripped-down, faster k-mer sketching tool for personal use---I didn't think about publishing at this point. This was built relatively quickly while I was zoning out at a mathematics conference that I attended back home in Vancouver. 

#### Part 2 - Stumbling across Skmer from Sarmashghi et al. (mid-late 2022)
------------

Prior to even starting sylph, I was writing a paper about [sequence alignment theory](https://genome.cshlp.org/content/early/2023/03/29/gr.277637.122) in mid-2022. I wanted to justify the usage of a particular statistical model of k-mer statistics.

Naturally, I went to [a familiar paper on k-mer statistics](https://doi.org/10.1089/cmb.2021.0431) by Blanca et al. to see what they cited, finding the paper ["Skmer: assembly-free and alignment-free sample identification using genome skims"](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1632-4) by Sarmashghi et al. 

I remember skimming through this paper, and while I didn't read through the math at the time, I understood the basic idea: **low-coverage sequencing creates problems for k-mer sketching**. 

Back to late-2022, I ran into the following problem while writing my new tool:

##### The low-abundance problem (technical; can skip)

----
Suppose a genome (in some database) **only shares a small fraction of its k-mers within a metagenome sequencing sample**. This could 

* be due to low sequencing depth in the metagenome (k-mers are not sequenced)

**OR** 

* be due to spurious k-mer matches that arise from a different species.

I wanted to compute the **containment average nucleotide identity** (ANI) by using k-mers: this containment ANI generalizes genome-genome ANI to _genome-metagenome_ ANI. If you want to do this using k-mers, sequencing depth becomes an issue. 

----

It turns out that the aforementioned Skmer paper _almost_ tackled the exact problem above, but there was an issue: the Skmer paper only compares genomes-to-genomes, but I needed to compare genomes-to-metagenomes.

So during 2022/2023, I spent a few nights at my local McDonald's, reading through the Skmer paper and working out the rough math for sylph. I implemented the statistical correction method and it seemed to work on some simulated sequences -- success!

#### Part 3 - Not knowing what to do for 5 months (2022 Dec - 2023 Apr)
------------

The statistical model for sylph was completed in early 2023, but I had no idea what to do with sylph. **I hadn't figured out how to make it a taxonomic profiler yet.** Let me explain the problem:

##### The abundance estimation problem (technical; can skip)
----
If you want the abundance of some organism in your metagenomic sample, most profilers do two steps: (1) classify reads against reference genomes and then (2) count the proportion of reads assigned to each genome.

However, if you have (1) two genomes from the same genus, e.g. _Escherichia_, in your database and (2) a single E. coli read, the read may be similar to multiple _Escherichia_ genomes. How do you "classify" reads in this case? All profilers have some way of dealing with this issue (e.g., Kraken uses a taxonomy). 

I didn't have a good way of dealing with this issue (even for "dereplicated" species-level databases) because sylph doesn't map reads---it just checks for k-mers, of which many can be shared between different species. 
----

**Back to sylph**: In summary, I had a method that can only check if a genome is contained in a sample (quickly and more accurately than other methods), but **not compute the abundance of the organism** (i.e., do _profiling_).

Funnily enough, I didn't try hard to tackle this issue. I thought that this was not the "right" problem to solve for sylph. During this time, I had a few other ideas that didn't pan out. Pulling up an old notebook, I see words such as "k-mer EM algorithm strain resolution" or "optimized sub-linear k-mer indexing"...

#### Part 4 - Try to build around an incomplete algorithm (2023 Apr - 2023 Aug)
------------

Eventually, in April/May of 2023, I settled on just presenting sylph, but **without the ability to estimate the abundances of organisms**. And by July/August 2023, I wrote a brief communication (~3 pages) based on sylph's statistical model and showed it could be used for quickly detecting low-coverage genomes. 

While preparing for manuscript submission, we worked a lot on figuring out how to present the paper. This was rather difficult given that people often only care about abundances.

#### Part 5 - Profiling: winner-take-all heuristic saves the day? (2023 Aug)
------------

I was planning on submitting sylph in August 2023, and we even had the cover letter ready. However, I was randomly browsing through the sourmash/Mash GitHub one day (I don't even remember what for), and I came across the "**winner-take-all**" k-mer heuristic. This is explained below: 

##### Reassigning k-mers and abundance (technical, can skip)

----

The idea behind the winner-take-all heuristic is simple: if a k-mer is shared across many genomes in the database, assign it to the genome with the highest estimated containment ANI. This could solve the abundance problem: if E. coli and E. fergusonii are in your database but only E. coli is present, all of the k-mers for E. fergusonii should be assigned to E. coli. E. fergusonii will have no k-mers left and be thresholded out (see Figure 1 in the sylph paper).

To the best of my knowledge, this heuristic is mentioned online (since 2017) but not explicitly explained anywhere, which is why I didn't run across it. I probably _should_ have thought of this idea. [Irber et al.](https://dib-lab.github.io/2020-paper-sourmash-gather/) use a very similar idea that I was familiar with, but the winner-take-all approach made more sense with the statistical model. 

----

**Trying the heuristic out:** I didn't believe this simple heuristic would work, but I decided to give it a try. It took less than an hour to implement, and it worked surprisingly well, so I hit pause on the submission. Comparatively, the statistical model is a more interesting and important contribution, but this was the breakthrough... surprisingly.

I finally had the capabilities to estimate organism abundance in August 2023, but I _did not_ want to do the benchmarking necessary for a paper. Benchmarking is much less fun than developing new methods. Unfortunately, the project seemed to have potential. 

In September 2023, I went to Tokyo to visit [Martin Frith](https://sites.google.com/site/mcfrith/) for three months. During these three months, all sylph-related work consisted of benchmarking sylph's new profiling abilities, creating figures, and rewriting the paper. Recall that it took only 1 hour to implement the winner-take-all heuristic... 

Luckily, sylph worked well. _Why_ does it work well? Perhaps this is the subject of a talk or another post. Anyways, by late November 2023, I started applying for academic jobs. The benchmarks seemed okay; the paper was tight enough, so we decided to get sylph out as a preprint. 

#### Part 6 - Bad results on real reads? (2023 Dec)
------------

In December 2023, Florian Plaza Oñate came to me with [a bug report](https://github.com/bluenote-1577/sylph/issues/5), suggesting that sylph was not performing well on real data sets. This was a head-scratching result. 

As any bioinformatics tool developer knows, your algorithms always perform worse on real data than benchmark data. There will be _some_ aspect of someone's data that violates your method's assumptions. However, the data Florian showed me seemed fishy enough that it wasn't just due to a small biological violation of the model... it seemed systemetically off. 

A key component of sylph's model is a *stochastic uniformity assumption* for read sequencing, leading to Poisson statistics for sequencing. After thinking for a while, I knew this had to be the issue. However, it was not clear if this was an inherent issue with the model, or a technological artefact. 

An unwritten law in bioinformatics is that if you don't know what's happening, you visualize it in the [IGV](https://igv.org/doc/desktop/). So I manually inspected some read alignments, and I found way more duplicated sequences than I expected. It turned out that **PCR duplicates were messing up sylph's statistical model, violating the Poisson assumption**. Did you know that many Illumina sequencing runs can have > 30% of reads being PCR duplicates? Perhaps embarassingly, I did not. 

After discovering this issue, I came up with a simple locality-sensitive hashing algorithm for removing PCR duplicates. This seemed to work okay, but I had to rerun a few of my results. This led to an important update and a preprint revision; the revision was also motivated due to people being mad at me for not benchmarking against the latest version of MetaPhlAn :) (lesson learned). This was completed in January 2024. 

#### Concluding thoughts (2024, now)
------------

I'm pleasantly surprised at sylph's reception so far. I've had people tell me personally/on social media that they've found sylph useful. Regardless of the journal we got into, as a tool developer, I've already been very happy with the outcome. 

Recently, I'm thrilled that sylph has been used for profiling **~2 million sequencing runs** in [Hunt et al.](https://www.biorxiv.org/content/10.1101/2024.03.08.584059v1). Also, apparently Oxford Nanopore Technologies found that [sylph was the best method on their long reads](https://a.storyblok.com/f/196663/x/3cff79e4ec/microbeconference_20240502-1333.pdf) as well (see Fig. 3). 

#### Concluding opinions, thoughts, and notes on development 
------------

**Development time usage**: Not including paper writing, I estimate I spent 75% of the time on experiments, plotting, and benchmarking compared to 25% developing the method (i.e. writing code, refining the algorithm). I wrote more snakemake, python, and jupyter notebook code than actual sylph code. Why did it take so long?

1. Figuring out **how** to benchmark is a pain for taxonomic/metagenomic profilers. You have to simulate your own benchmarks, make scripts for normalizing outputs, wrangle other methods' databases, etc. There are many many potential pitfalls. 
2. Figuring out **what** to benchmark is a challenge. This requires a lot of thought. 

These time proportions depend on the project. For comparison, sylph's algorithm is simpler than a genome assembler, which would take more development time. I also think that it's okay to not spend all your time on software development; I'm a scientist, not a software engineer. A significant part of a tool development project _should_ be figuring out how to benchmark and fit your method into scientific context. 

**Do people care about benchmarks anyway?** Here's another thing I noticed: many people don't trust bioinformatics benchmarks. Lots of people fall into two categories:

* If a tool's performance is not critical, the author benchmarks don't matter that much. People will just play around with your software. 
* If a tool's performance is critical, you'll do your own tests instead of trusting author benchmarks; benchmarks from the tool's authors always place their tool at the top anyways (mysteriously).

**Algorithm progress is highly non-linear as a function of time.** It's hard to predict progress. Furthermore, this project started out way different than how it ended up. I think a more natural approach to method development is correct, rather than shooting for a goal. This means you're tackling problems in the correct way. 

**Benchmarking taxonomic profilers is hard**. I already [wrote a post about benchmarking taxonomic profilers](https://jim-shaw-bluenote.github.io/blog/2023/profiling-development/). Taxonomic profilers are especially bad because database construction is not intuitive and time consuming. 

**The end**: hopefully this was informative. Feel free to let me know if you have any complaints. 
