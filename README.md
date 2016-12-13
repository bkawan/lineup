LineUp.js: Visual Analysis of Multi-Attribute Rankings [![Build Status](https://travis-ci.org/Caleydo/lineup.js.svg?branch=master)](https://travis-ci.org/Caleydo/lineup.js)
======================================================

LineUp is an interactive technique designed to create, visualize and explore rankings of items based on a set of heterogeneous attributes. 
This is a D3-based re-implementation with limited functionality relative to the original stand-alone LineUp, which you can check out at http://lineup.caleydo.org

Dependencies
------------

LineUp.js depends on [D3](http://d3js.org) for rendering and [FontAwesome](http://fontawesome.io/) for icons in the toolbar. Both dependencies are declared as bower dependencies. 

Development Dependencies
----------------

[Webpack](http://webpack.github.io) is used as build tool. LineUp itself is written in [TypeScript](www.typescriptlang.org) and [SASS](http://sass-lang.com). 

### Development Environment

**Installation**

```bash
npm run prepare
```


**Test**

```bash
npm run test
```

**Build distribution packages**

```bash
npm run build
```


**Watch file changes**

```bash
npm run watch
```

The compiled JavaScript files are located under _dist_ and the TypeScript documentation is located under _dist_/_docs_.

DOM Structure
-------------

The DOM elements are composed of three parts: header, body, and pool. 
The header and pool are using HTML5 and the body SVG. However, the body could be rewritten to using HTML, too. 
The body is using a mix of row and column based approach. Rows are used for the background alteration and for hovering over rows. 
Column groups are used for efficient use of D3 for rendering individual columns. Individual columns require different rendering strategies. 

Data Model
----------

![Data Model](assets/data_model.png)
![Data Model](../../assets/data_model.png)

Documentation
-------------

[TypeDoc Docu](http://caleydo.github.io/lineup.js/dist/docs/index.html)



- This new line added 
- This is 2nd new line added
- this is 3rd new line added

