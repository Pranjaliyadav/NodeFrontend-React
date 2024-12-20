import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query : `
      {
      getPostById(id :"${postId}"){
      title
      content
      imageUrl
      creator{name}
      createdAt
      }
      }
      `
    }
    fetch('http://localhost:8080/graphql' ,
      { method : 'POST',
        headers : {
      Authorization : `Bearer ${this.props.token}`,
      'Content-Type':'application/json'
    },
    body : JSON.stringify(graphqlQuery)
  })
      .then(res => {
        if ( res.errors && res.errors[0].status=== 422 ) {
          throw new Error(
          res.errors[0].data[0].message
          );
        }
        if(res.errors){
          throw new Error('Error fetching post')
        }
        return res.json();
      })
      .then(resData => {
        console.log("here image pth",{   image : `http://localhost:8080/${resData.data.getPostById.imageUrl}`})
        this.setState({
          title: resData.data.getPostById.title,
          author: resData.data.getPostById.creator.name,
          image : `http://localhost:8080/${resData.data.getPostById.imageUrl.replace(/\\/g, '/')}`,
          date: new Date(resData.data.getPostById.createdAt).toLocaleDateString('en-US'),
          content: resData.data.getPostById.content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
