---
layout: post
title:  "The story of sylph - a look into bioinformatics tool development"
date:   2024-10-08 
categories: jekyll update
---

In this blog post, I will talk about the process of developing [sylph](https://github.com/bluenote-1577/sylph), a bioinformatics tool we (me and my advisor, [William](https://yunwilliamyu.net/content/)) developed. 

I've always found the inner workings of research interesting. This is my contribution. My goal is to demystify tool development in bioinformatics a bit. 

#### Prelude: what is sylph?

Sylph is a new method/software that detects organisms present in [metagenomic DNA sequencing](https://www.nature.com/articles/nbt.3935) of microbiomes. A metagenomic sample is a collection of small DNA sequences of the genomes in a microbial community (e.g. your gut microbiome). 

This post won't be about the sylph algorithm, but about its development process. I'll assume some familiarity with computational metagenomics going forward, but it's not strictly necessary. 

#### Part 1 - Initial motivation: let's write a faster Mash (late 2022)
-----------

The first paper I ever read in the field of bioinformatics was the [Mash](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0997-x) paper by Ondov et al. back in 2017 (during an undergraduate internship with [Niranjan](https://www.a-star.edu.sg/gis/our-people/faculty-staff/members/niranjan-nagarajan) in Singapore). This ended up being an important inspiration for sylph. 

If you're unfamiliar with Mash, it's simply a method for calculating the similarity between two genomes. It does so by analyzing _sketches_, or small subsets, of k-mers. See [this nice blog post](https://genomeinformatics.github.io/mash-screen/) on the related "Mash screen" algorithm for background. [Sourmash](https://github.com/sourmash-bio/sourmash) is a nice, related tool too; I recall meeting with [Titus Brown](http://ivory.idyll.org/lab/) in 2022 and learned quite a bit about sourmash from him. 

The Mash algorithm is simple but powerful. It has tremendously influenced how I feel bioinformatics tools should be: __fast, easy to use, and accurate enough__ for generating biological hypotheses. 

**Sylph started from a simple curiosity:** when writing [my skani paper](https://www.nature.com/articles/s41592-023-02018-3) in 2022, I noticed that I could create k-mer sketches faster than Mash. This was done by adapting the k-mer processing routines from [minimap2](https://github.com/lh3/minimap2) and learning how to use SIMD instructions to speed stuff up. 

I thought this was neat, so I sought to write a stripped-down, multi-threaded k-mer sketching tool for metagenomics---primarily for personal use---without thinking about publishing at this point. This was built relatively quickly while I was zoning out during a Math conference I attended back home in Vancouver. 

#### Part 2 - Stumbling across Skmer from Sarmashghi et al. (mid-late 2022)
------------

Prior to even starting sylph, I was writing a paper about [sequence alignment theory](https://genome.cshlp.org/content/early/2023/03/29/gr.277637.122) in mid-2022, and I wanted to justify the usage of a particular statistical model. More specifically, I needed a citation for the intuition: "idependent and identitically distributed Bernoulli mutation models work pretty well for k-mer statistics". 

Naturally, I went to [a familiar paper on k-mer statistics](https://doi.org/10.1089/cmb.2021.0431) by Blanca et al. to see what they cited. I found the paper ["Skmer: assembly-free and alignment-free sample identification using genome skims"](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1632-4). 

I remember skimming through the paper, and while I didn't read through the math at the time, I understood the basic idea: **low-coverage sequencing creates problems for k-mers**. It seemed like a great paper, but I didn't think more about it at the time. 

Back to late 2022, I had my fast fast-metagenomic-k-mer-sketcher pretty much completed. While I was messing around with it, I ran into the following problem.

##### The low-abundance problem (technical; can skip)

----
Suppose a genome (in some database) **only shared a small fraction of its k-mers with a metagenome**, this could 

* be due to low sequencing depth in the metagenome (k-mers are not sequenced)

**OR** 
* because the k-mers are spurious matches that arise infrequently from a related but different species.

I wanted to compute the **containment average nucleotide identity** (ANI) accurately by using k-mers. This generalizes genome-genome ANI to _genome-metagenome_ ANI. And while there are methods for calculating ANI from k-mers, this issue obfuscates ANI calculation from k-mers.

----

It turns out that the Skmer paper _almost_ tackled the exact problem above, but there was an issue: the Skmer paper only compares genomes-to-genomes, and I needed to compare genomes-to-metagenomes.

So during 2022/2023, around the new year, I spent a few nights at my local McDonalds back home in Vancouver, reading through the Skmer paper and working out the rough math for sylph. I implemented the statistical correction method and it seemed to work on some simulated sequences -- success!

#### Part 3 - Not knowing what to do for 5 months (2022 Dec - 2023 Apr)
------------

The statistical model for sylph was completed in early 2023. I was busy with reviews, conferences, and other projects, but I also had no idea what to do with sylph. **I hadn't figured out how to make it a taxonomic profiler yet.** Let me explain the problem.

##### The abundance estimation problem (technical; can skip)
----
If you want the abundance of some organism in your metagenomic sample, most profilers do two steps: (1) classify reads against reference genomes and then (2) count the proportion of reads assigned to each genome.

However, if you have two very similar E. coli genomes in your database and an E. coli read, its assignment is ambiguous. How do profilers deal with this? Well, [Kraken](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1891-0) uses a taxonomy to say "these E. coli _strains_ are from the same _species_, so just assign the read to the E. coli _species_". All profilers have some way of dealing with this issue.

I had no way of dealing with this issue (even for "dereplicated" databases) since sylph doesn't map reads -- it just checks for k-mers, of which many can be shared between different species. At this time, sylph's profiling didn't work well at all. 

----

**Back to sylph**: In summary, I had a method that can only check if a genome is contained in a sample (quickly and more accurately than other methods), but **not compute the abundance of the organism** (i.e., do _profiling_).

Funnily enough, I didn't try hard to tackle this issue. For some reason, I just accepted that this was not the "right" problem to solve for sylph -- could I really do something better than all of the profilers out there? 

During this time, I had a few other ideas that didn't pan out. Pulling up an old notebook, I see words such as "k-mer EM algorithm strain resolution" or "optimized sub-linear k-mer indexing"...

#### Part 4 - Try to build around an incomplete algorithm(2023 Apr - 2023 Aug)
------------

Eventually, in April/May of 2023, I settled on just presenting sylph but without the ability to estimate the abundances of organisms. 

By July/August 2023, I wrote a brief communication (~3 pages) based on sylph's statistical model and showed it could be used for quickly detecting low-coverage genomes, strains of interest, etc. 

While preparing for manuscript submission, we worked a lot on figuring out how to present the paper. This was rather difficult given that people often only care about abundances, not the "containment ANI" capabilities sylph had. 

#### Part 5 - Profiling: winner-take-all heuristic saves the day? (2023 Aug)
------------

I was planning on submitting sylph in August 2023 (we had the cover letter ready), but I was randomly browsing through the sourmash/Mash GitHub one day (I don't even remember what for). I came across the "**winner-take-all**" heuristic somewhere. This is explained below. 

##### Reassigning k-mers and abundance (technical, can skip)

----

The idea behind the winner-take-all heuristic is simple: if a k-mer is shared across many genomes in the database, assign it to the genome with the highest estimated ANI. Then, apply a new ANI cutoff for genomes after reassignment. This could solve the abundance problem because if only E. coli strain A is present, all of the k-mers for E. coli strain B's genome will be assigned to E. coli strain A, and then B will have no k-mers left and be thresholded out (see Figure 1 in the sylph paper).

To the best of my knowledge, this heuristic is mentioned online (since 2017) but not explicitly explained anywhere, which is why I didn't run across it. I probably _should_ have thought of this idea. [Irber et al.](https://dib-lab.github.io/2020-paper-sourmash-gather/) use a very similar idea which I was familiar with, but the winner-take-all approach made more sense with the statistical model. 

----

**Trying the heuristic out:** I didn't believe this simple heuristic would work, but I decided to give it a try. It took less than an hour to implement, and it worked surprisingly well. I hit pause on the submission. Comparatively, the statistical model is a more interesting and important contribution, but this was the breakthrough... surprisingly.

So I finally had a profiler in August 2023, but I did _not_ want to do the benchmarking necessary for developing a profiler. Benchmarking is much less fun than developing new methods. Unfortunately, the project seemed to have potential. 

In September 2023, I went to Tokyo to visit [Martin Frith](https://sites.google.com/site/mcfrith/) for three months. During these three months, all sylph-related work consisted of benchmarking sylph's new profiling abilities, creating figures, and rewriting the paper. Recall that it took only 1 hour to implement the winner-take-all heuristic... 

Luckily, sylph worked well. _Why_ does it work well? Perhaps this is the subject of a talk or another post. Anyways, by late November 2023, I started applying for academic jobs. The benchmarks seemed okay, the paper was tight enough, so we decided to get sylph out as a preprint. 

#### Part 6 - Bad results on real reads? (2023 Dec)
------------

In December 2023, Florian Plaza Oñate came to me with [a bug report](https://github.com/bluenote-1577/sylph/issues/5), suggesting that sylph was not performing well on real data sets. This was a head-scratching result. 

As any bioinformatics tool developer knows, your algorithms always perform worse on real data than benchmark data. There will be _some_ aspect of someone's data that violates your method's assumptions. However, the data Florian showed me seemed fishy enough that it wasn't just due to a small biological violation of the model... it seemed systemetically off. 

A key component of sylph's model is a *stochastic uniformity assumption* for read sequencing. After thinking for a while, I knew this had to be the issue. However, it was not clear if this was an inherent issue with the model, or a technological issue. An inherent issue can't be fixed, but maybe a technological issue could be. 

An unwritten law in bioinformatics is that if you're not sure what's happening, you visualize it in the [IGV](https://igv.org/doc/desktop/). So I manually inspected read alignments, and I found way more duplicated sequences than I expected. It turned out that **PCR duplicates were messing up sylph's statistical model**. Did you know that many Illumina sequencing runs can have > 30% of reads being PCR duplicates? I did not. 

After discovering this issue, I came up with a simple locality-sensitive hashing algorithm for removing PCR duplicates. This seemed to work okay, but I had to rerun a few of my results. This led to an important update and a preprint revision. This was completed in January 2024. Special thanks to Florian for pointing this issue out. 

#### Concluding thoughts (2024, now)
------------

I'm pleasantly surprised at sylph's reception so far. I've had people tell me personally/on social media that they've found sylph useful. Regardless of the journal we got into, as a tool developer, I've already been very happy with the outcome. Recently, I'm thrilled that sylph has been used for profiling **~2 million sequencing runs** in [Hunt et al.](https://www.biorxiv.org/content/10.1101/2024.03.08.584059v1). Recently, apparently Oxford Nanopore Technologies found that [sylph was the best method on their long reads](https://a.storyblok.com/f/196663/x/3cff79e4ec/microbeconference_20240502-1333.pdf) as well. 

#### Concluding opinions, thoughts, and notes on development 
------------

**Development time usage**: Not including paper writing, I estimate I spent 75% of the time on experiments, plotting, and benchmarking compared to 25% developing the method (i.e. writing code, refining the algorithm). I wrote more snakemake, python, and jupyter notebook code than actual sylph code. Why did it take so long?

1. Figuring out **how** to benchmark is a pain for profilers. You have to simulate your own benchmarks, make scripts for normalizing outputs, wrangle other methods' databases, etc.
2. Figuring out **what** to benchmark is a challenge. This requires a lot of thought. 
3. We wanted to showcase containment ANI capabilities, but this isn't commonly done. So we have to do new biological examples -- this takes a bunch of time. 

These time proportions depend on the project. For comparison, sylph's algorithm is simpler than a sequence assembler, which would take more development time. I also think that it's okay to not spend all your time on software development -- I'm a scientist, not a software engineer. A significant part of a tool development project _should_ be figuring out how to benchmark and fit your method into scientific context. 

**Do people care about benchmarks anyway?** Here's another thing I noticed: many people don't trust bioinformatics benchmarks. Lots of people fall into two categories:

* If performance is not critical, author benchmarks don't matter that much. People will just play around with your software. 
* If performance is critical, you'll do your own tests instead of trusting author benchmarks; benchmarks from the tool's authors always place their tool at the top anyways (mysteriously).

**Algorithm progress is highly non-linear as a function of time.** It's hard to predict progress. Furthermore, this project started out way different than how it ended up. I think a more natural approach to method development is correct, rather than shooting for a goal. This means you're tackling problems in the *correct* way. 

**Benchmarking taxonomic profilers is hard**. I already [wrote a post about benchmarking taxonomic profilers](https://jim-shaw-bluenote.github.io/blog/2023/profiling-development/). Taxonomic profilers are especially bad because database construction is not intuitive and time consuming. 

**The end**: hopefully this was informative. Feel free to let me know if you have any complaints. 

