---
layout: post
title:  "The story of sylph - a look into bioinformatics tool development"
date:   2024-03-21 
categories: jekyll update
---

In this blog post, I will talk about the process of developing [sylph](https://github.com/bluenote-1577/sylph), a bioinformatics tool we [preprinted](https://www.biorxiv.org/content/10.1101/2023.11.20.567879v2) (with my advisor, [William](https://yunwilliamyu.net/content/)) recently and is currently under review. 

### What this blog post is about

I've always found the inner workings of how science is done much more fascinating (and informative) than the polished product we're presented with. This is my contribution. My goal is to demystify tool development in bioinformatics a bit. 

### Prelude: what is sylph?

Briefly, sylph is a program that takes in [metagenomic sequences](https://www.nature.com/articles/nbt.3935) and a database of genomes. It then tells you if any genomes in your database are present in your metagenomic sample. It outputs 

* how _abundant_ the organisms in your community are. This task is called metagenomic profiling, (e.g. Kraken)
* the  _similarity_ between an input genome and the genomes in your sample. This task is called _containment_. 

See [this nice blog post](https://genomeinformatics.github.io/mash-screen/) for Mash screen for background.

This post won't be about sylph, but more so about its development process. Going forward, I'll assume some familiarity with computational metagenomics, e.g. you know what profiling, average nucleotide identity, and k-mers are. 

## Part 1 - k-mers, sketching, and Mash (prior to sylph)

I started working on sylph in December 2022. However, my first experience with computational biology was in 2017 through an undergraduate research internship. Funnily enough, the first paper I ever read was the [Mash](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0997-x) paper by Ondov et al., which ended up being an inspiration for sylph. 

If you're unfamiliar with Mash, it's a method that computes a _sketch_ of k-mers (i.e. a set of k-length DNA substrings) for genomes and uses set intersections/unions to tell how similar two genomes are. The Mash algorithm is simple but powerful -- it has tremendously influenced how I feel bioinformatics tools should be: __fast, easy to use, and accurate__ (enough). 

## Part 2 - Initial motivation: let's write a faster Mash (late 2022)

Sylph started from a simple curiosity: when writing [skani](https://www.nature.com/articles/s41592-023-02018-3) in 2022, I noticed that I could create k-mer sketches faster than Mash. I essentially just adapted the k-mer processing routines from [minimap2](https://github.com/lh3/minimap2) and found it worked 3-4x faster than Mash. I thought this was neat. 

I care about metagenomics and microbiome informatics, and  [sourmash](https://github.com/sourmash-bio/sourmash) slightly more suitable for metagenomics than Mash. I found that I could also sketch faster than sourmash (but they use a more comprehensive sketch, I think).

So I sought to write a stripped-down, multi-threaded sourmash for metagenomics primarily for personal use and also to possibly share -- I certainly didn't think of publishing anything at this point. I had k-mer processing code from previous software, so this was built relatively quickly while I was zoning out during a Math conference I attended back home in Vancouver. 

## Part 3 - Stumbling across Skmer (Sarmashghi et al., 2019)

When I was writing a paper about sequence alignment theory in mid-2022, I remember that I needed a citation for the following intuition: "i.i.d Bernoulli mutation models work pretty well for k-mer statistics". So I went to the [following paper](https://doi.org/10.1089/cmb.2021.0431) by Blanca et al. to see what they cited, and I found the paper ["Skmer: assembly-free and alignment-free sample identification using genome skims"](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1632-4). 

I remember skimming (hah) through the paper, and while I didn't read through the math at the time, I understood the basic idea: **for k-mer sketches, low-coverage sequencing causes biased sequence identity measurements**. It seemed like a great paper, but I didn't think more about it.

Back to late 2022, I had my fast sourmash-lite pretty much completed. While I was messing around with it, I ran into the following problem.

# The low-abundance problem (technical, can skip)

----
Suppose a database genome **only shared a small fraction of its k-mers with a metagenome**, this could 

* be due to low sequencing depth in the metagenome (k-mers are not sequenced)

**OR** 
* because the k-mers are spurious matches that arise from a related but different species.

What I wanted was to compute the **average nucleotide identity** (ANI) accurately. And while there are methods for calculating ANI from k-mers, this issue obfuscates ANI calculation from k-mers.

----

It turns out that the Skmer paper _almost_ tackled this exact problem, but there was an issue: the Skmer paper only compares genomes-to-genomes, and I needed to compare genomes-to-metagenomes.

So during 2022/2023 Christmas break, I recall trying to understand the Skmer paper. I recall that I worked out the rough math for sylph at the McDonalds across the bridge near the airport in Vancouver... Anyway, the method seemed to work on some simulated sequences -- success!

## Part 4 - Not knowing what to do for 5 months (2022 Dec - 2023 Apr)

The statistical model for sylph was completed in early 2023. I was busy with reviews, conferences, and other projects for early 2023, but I also had no idea what to do with sylph -- I hadn't figured out how to make it a taxonomic profiler yet. Let me explain the problem.

# The abundance estimation problem (technical, can skip)
----
If you want the abundance of some organism in your sample, most profilers (1) classify reads against references and (2) count the proportion of reads assigned to each genome.

However, if you have two very similar E. coli genomes in your database and an E. coli read, its assignment is ambiguous. How do profilers deal with this? Well, [Kraken](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1891-0) uses a taxonomy to say "these E. coli _strains_ are from the same species, so just assign the read to the E. coli _species_". All profilers have some way of dealing with this issue (or they just use a database without duplicate strains).

I had no way of dealing with this issue since sylph doesn't map reads -- it just checks for k-mers, of which many can be shared between different species. It didn't even work well when I was using a database without duplicate strains. 

----

# Back to sylph

I had method that can only check if a genome is contained in a sample (quickly and more accurately), but **not compute abundances**.

The funny thing is, I didn't try that hard to deal with this issue. For some reason, I just accepted that this was not the "right" problem to solve for sylph -- could I really do something better than all of the profilers out there? 

During this time, I had a few other ideas that didn't pan out. Pulling up an old notebook, I see words such as "k-mer EM algorithm strain resolution" or "optimized sub-linear k-mer indexing". 

## Part 5 - Try to build around ANI estimation (2023 Apr - 2023 Aug)

Eventually, in April/May of 2023, I settled on just marketing sylph for containment ANI estimation. By July/August 2023, I wrote a brief communication (~3 pages) based on sylph's statistical model and that it could be used for quickly detecting low-coverage genomes, strains of interest, etc. 

I was preparing for submission with the blessing of my advisor. We worked a lot on figuring out how to sell the paper, which was rather difficult given that people mostly just cared about abundances, not containment ANI. Even now, most people only care about sylph as a profiler. Ultimately, I think the paper would have been fine, but not amazing.

## Part 6 - Profiling: winner-take-all heuristic saves the day? (2023 Aug)

I was planning on submitting sylph in August 2023 (we had the cover letter ready), but I was randomly browsing through the sourmash/Mash GitHub one day -- I don't remember what for -- and I came across the "**winner-take-all**" heuristic somewhere.

# Reassigning k-mers and abundance (technical, can skip)

----

The idea behind the winner-take-all heuristic is simple: if a k-mer is shared across many genomes in the database, assign it to the genome with the highest estimated ANI. Then, apply a new ANI cutoff for genomes after reassignment. This could solve the abundance problem because if only E. coli strain A is present, all of the k-mers for E. coli strain B's genome will be assigned to E. coli strain A, and then B will have no k-mers left and be thresholded out (see Figure 1 in the sylph paper).

To the best of my knowledge, this heuristic is mentioned online (since 2017) but not explicitly explained anywhere, which is why I didn't run across it. I probably _should_ have thought of this idea. [Irber et al.](https://dib-lab.github.io/2020-paper-sourmash-gather/) use a very similar idea which I was familiar with, but the winner-take-all approach made more sense with the statistical model. 

----

# Trying the heuristic out 

I didn't actually believe this would work, but I decided to give it a try. The idea was simple and it took less than an hour to implement. It worked relatively well, so I hit pause on the submission. Comparatively, the statistical model is a more interesting and important contribution, but this was the breakthrough... surprisingly.


## Part 7 - Profiling successful! To preprinting (2023 Aug - 2023 Nov)

It appeared that I may have finally had a profiler in August 2023. I did _not_ want to do the benchmarking necessary for developing a profiler. Unfortunately, the project seemed to have potential. 

In September 2023, I went to Tokyo to visit [Martin Frith](https://sites.google.com/site/mcfrith/) for three months. During these three months, all work on sylph consisted of only benchmarking sylph's new profiling abilities, creating figures, and rewriting the paper. Recall that it took only 1 hour to implement the winner-take-all heuristic... 

Luckily, sylph worked well. _Why_ does it work well? Perhaps this is the subject of a talk or another post. By late November 2023, I started applying for academic jobs. The benchmarks seemed okay, the paper was tight enough, so we decided to get sylph out as a preprint. 

## Part 8 - Bad results on real reads? (2023 Dec)

In December 2023, Florian Plaza Oñate came to me with [a bug report](https://github.com/bluenote-1577/sylph/issues/5), suggesting that sylph was not performing well on real data sets. This was a head-scratching result. 

I investigated further and it turned out that **PCR duplicates were messing up sylph's statistical model**. Did you know that many Illumina sequencing runs have > 20% of reads being PCR duplicates? _I did not_. Perhaps this makes me a bad bioinformatician. I won't get into the technical details, but this killed the statistical model for some datasets. 

After discovering this issue, I came up with a simple locality-sensitive hashing algorithm for removing PCR duplicates (and learned about what a [scalable bloom filter](https://gsd.di.uminho.pt/members/cbm/ps/dbloom.pdf) is while doing so). This seemed to work okay, but I had to rerun a few of my results. This led to an important update and a preprint revision. This was completed in January 2024. 

### Concluding thoughts (2024 -- Now)

I'm pleasantly surprised at sylph's reception so far. I've had people tell me personally/on social media that they've found sylph useful. Regardless of what journal we end up getting into, as a tool developer, I've already been very happy with the outcome. Recently, I'm thrilled that sylph has been used for profiling **~2 million sequencing runs** in [Hunt et al.](https://www.biorxiv.org/content/10.1101/2024.03.08.584059v1)

# Opinions, thoughts, and notes on development 

**Development time usage**: Not including paper writing, I estimate I spent 85% of the time on experiments, plotting, and benchmarking and 15% developing the method (i.e. writing code, refining the algorithm). I wrote more snakemake, python, and jupyter notebook code than actual sylph code. Why did it take so long?

1. Figuring out **how** to benchmark is a pain for profilers.  [OPAL](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1646-y) is nice, but you have to simulate your own benchmarks, scripts for normalizing outputs, wrangle other methods, etc.
2. Figuring out **what** to benchmark is a challenge. This requires a lot of thought. 
3. We wanted to showcase containment ANI capabilities, but this isn't commonly done. So we have to do new biological showcases -- this takes a bunch of time. 

These time proportions drastically changes depending on the project. The underlying algorithm is much simpler than an assembler, which would take much more development time. Nevertheless, the following quote seems pertinent:

"[Shorter bioinformatics papers] [ ... takes less time to write, giving me more time on solving other problems. More importantly, I don’t need to fight to claim significance and novelty which are subjective most of time.](https://lh3.github.io/2015/02/13/comments-on-illumina-error-correction)"

**Do people care about benchmarks anyway?** Here's another thing I noticed: many people don't trust bioinformatics benchmarks. Lots of people fall into two categories:

* If performance is not critical, author benchmarks don't matter that much. 
* If you use the tool seriously, you'll do your own tests instead of trusting author benchmarks.

**Algorithm progress is highly non-linear as a function of time.** It's hard to predict progress. Furthermore, this project started out way different than how it ended up. I think a more natural approach to method development is good though, because it means you're tackling problems in a natural, correct way. 

**Benchmarking taxonomic profilers is hard**. I already [wrote a post about benchmarking taxonomic profilers](https://jim-shaw-bluenote.github.io/jekyll/update/2023/11/24/profiling-development). Taxonomic profilers are especially bad because database construction is not intuitive and time consuming. 

**The end**: hopefully this was informative. Feel free to let me know if you have any complaints. 

