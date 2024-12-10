import React, { Component, Fragment } from 'react';
import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    fetch('http://localhost:8080/auth/get-status',{  headers : {
      Authorization : `Bearer ${this.props.token}`
    },})
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.status });
      })
      .catch(this.catchError);

    this.loadPosts();
 
  }


  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlQuery = {
      query:`{
      getPosts(page : ${page}){
      posts{
      _id
      creator{name}
      createdAt
      title
      content
      imageUrl
      }
      totalPosts
      }}
      `
    }


    fetch('http://localhost:8080/graphql',{
      method : 'POST',
      headers : {
        Authorization : `Bearer ${this.props.token}`,
        'Content-Type' : 'application/json'
      },
      body : JSON.stringify(graphqlQuery)
    })
      .then(res => {
        console.log("getpos", res, this.props.token)
        if ( res.errors && res.errors[0].status=== 422 ) {
          throw new Error(
          res.errors[0].data[0].message
          );
        }
        if(res.errors){
          throw new Error('Fetching data failed')
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.data.getPosts.posts.map(post => {
            return {
              ...post,
              imagePath : post.imageUrl
            }
          }),
          totalPosts: resData.data.getPosts.totalPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('http://localhost:8080/auth/update-status',{
      method : 'PUT',
      headers : {
        Authorization : `Bearer ${this.props.token}`,
        'Content-Type' : 'application/json'
      },
      body : JSON.stringify({status : this.state.status})
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    
  const formData = new FormData()
  formData.append('image',postData.image)
  if(this.state.editPost){
    formData.append('oldPath', this.state.editPost.imagePath)
  }
  fetch('http://localhost:8080/post-image',{
    method : 'PUT',
    headers : {
      Authorization :`Bearer ${this.props.token}`,
    },
  body : formData
  })
  .then(res => res.json())
  .then(fileRes => {
    const imageUrl = fileRes.filePath

    let graphqlQuery =
    this.state.editPost ? 
    {
      query :  `
      mutation{
      updatePost(id : "${this.state.editPost._id}", postUpdateInput : {title : "${postData.title}", content : "${postData.content}", imageUrl :"${imageUrl ? imageUrl.replace(/\\/g, '\\\\') : imageUrl}"}){
      _id
      title
      imageUrl
      content
      creator { 
      name
      }
      createdAt
      }
      }
      `
    }
    :
    {
      query :  `
      mutation{
      createPost(postCreateInput : {title : "${postData.title}", content : "${postData.content}", imageUrl :"${imageUrl.replace(/\\/g, '\\\\')}"}){
      _id
      title
      imageUrl
      content
      creator { 
      name
      }
      createdAt
      }
      }
      `
    }
    console.log("here props", this.props.token)
  return  fetch('http://localhost:8080/graphql',{
      method : 'POST',
      headers : {
        Authorization : `Bearer ${this.props.token}`,
        'Content-Type' : 'application/json'
      },
      body :JSON.stringify(graphqlQuery)
    })
  })
.then(res => {
        if ( res.errors && res.errors[0].status=== 422 ) {
          throw new Error(
          res.errors[0].data[0].message
          );
        }
        if(res.errors){
          throw new Error('Post creation failed')
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData, "here created")
        const post ={

          _id :this.state.editPost ? resData.data.updatePost._id :  resData.data.createPost._id,
          title :this.state.editPost ? resData.data.updatePost.title :  resData.data.createPost.title,
          content : this.state.editPost ? resData.data.updatePost.content :   resData.data.createPost.content,
          createdAt :this.state.editPost ? resData.data.updatePost.createdAt :   resData.data.createPost.createdAt,
          creator :this.state.editPost ? resData.data.updatePost.creator :  resData.data.createPost.creator,
          imagePath :this.state.editPost ?  resData.data.updatePost.imageUrl : resData.data.createPost.imageUrl

        }
        this.setState(prevState => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              p => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else {
            updatedPosts.pop()
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false
          };
        });
        
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch('http://localhost:8080/feed/post/' + postId, {
      method : 'DELETE',
      headers : {
        Authorization : `Bearer ${this.props.token}`
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p._id !== postId);
        //   return { posts: updatedPosts, postsLoading: false };
        // });
        this.loadPosts()
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
